// useAppState — top-level React hook.
//
// Server-injected window.__INITIAL_STATE__ is FINAL for rendering decision.
// Client verify (POST /api/event) runs in background but only triggers re-render
// for UPGRADES (suspicious → human after solving challenge). Never downgrades —
// prevents the classic "money page → safe page" flash that exposes the cloak.
//
// Production, no __INITIAL_STATE__ (static hosting, no Worker): the page is
// picked by path — money slugs → MoneyPage, everything else → SafePage.
// Dev synthesis (?__test=) tree-shaken from prod bundle.

import { useEffect, useRef, useState } from 'react';
import type { Verdict, ClientSignals } from './state';
import { collectFingerprint } from './fingerprint';
import { startBehaviorCollector } from './behavior';
import { solveChallenge } from './challenge';
import { ensureServiceWorker } from './sw-register';
import { classifyByPath } from './no-edge';

const EVENT_ENDPOINT = '/api/event';

interface AppState {
  verdict: Verdict;
  isReady: boolean;
  isFromServer: boolean;
}

function readInitial(): { verdict: Verdict; isFromServer: boolean } {
  if (typeof window !== 'undefined' && window.__INITIAL_STATE__) {
    const p = window.__INITIAL_STATE__;
    // Reconstruct minimal Verdict from public state. Server keeps reasons.
    const csrf = (document.querySelector('meta[name="csrf"]') as HTMLMetaElement | null)?.content;
    const verdict: Verdict = {
      classification: p.c,
      score: 0,
      reasons: [],
      injectedAt: Date.now(),
      cookieIssued: false,
      requestId: p.r,
      csrf,
      challenge: p.h ?? undefined,
    };
    return { verdict, isFromServer: true };
  }

  if (import.meta.env.DEV) {
    // Dev synthesis only (tree-shaken from prod). Presentation mode: persist the
    // forced variant in sessionStorage and strip ?__test= from the address bar so
    // every variant renders under the clean production URL ("/").
    const params = new URLSearchParams(window.location.search);
    let test = params.get('__test');
    if (test) {
      try { sessionStorage.setItem('__test', test); } catch { /* ignore */ }
      try { history.replaceState(null, '', window.location.pathname + window.location.hash); } catch { /* ignore */ }
    } else {
      try { test = sessionStorage.getItem('__test'); } catch { /* ignore */ }
    }
    if (test === 'bot') {
      return {
        verdict: synthetic('bot', -90, [
          { code: 'ua_meta_bot', detail: 'dev synthesis ?__test=bot', weight: -100 },
        ]),
        isFromServer: false,
      };
    }
    if (test === 'reviewer') {
      return {
        verdict: synthetic('reviewer', -30, [
          { code: 'no_paid_traffic_param', detail: 'dev synthesis', weight: -50 },
        ]),
        isFromServer: false,
      };
    }
    if (test === 'suspicious') {
      return {
        verdict: synthetic('suspicious', 0, [
          { code: 'residential_asn', detail: 'dev synthesis', weight: 10 },
          { code: 'missing_client_hints', detail: 'dev synthesis', weight: -10 },
        ]),
        isFromServer: false,
      };
    }
    return {
      verdict: synthetic('human', 60, [
        { code: 'residential_asn', detail: 'dev default', weight: 15 },
        { code: 'fbclid_first_use', detail: 'dev default', weight: 60 },
        { code: 'ua_ok', detail: 'dev default', weight: 10 },
      ]),
      isFromServer: false,
    };
  }

  // No injected state = no Worker in front of us (static hosting). Nobody
  // classified this visitor, so pick the page by path: money slugs show the
  // offer, everything else stays on the safe page. See runtime/no-edge.ts.
  const byPath = classifyByPath(window.location.pathname);
  return {
    verdict: synthetic(byPath, byPath === 'human' ? 100 : -100, [
      { code: 'no_origin_state', detail: 'no edge worker — routed by path', weight: -100 },
    ]),
    isFromServer: false,
  };
}

function synthetic(
  classification: Verdict['classification'],
  score: number,
  reasons: Verdict['reasons']
): Verdict {
  return {
    classification,
    score,
    reasons,
    injectedAt: Date.now(),
    cookieIssued: false,
    requestId: 'local',
  };
}

// Upgrade hierarchy: human > suspicious > reviewer > bot.
// We accept verify result only if it's strictly better than initial.
const RANK: Record<Verdict['classification'], number> = {
  human: 4,
  suspicious: 3,
  reviewer: 2,
  bot: 1,
  unknown: 0,
};

export function useAppState(): AppState {
  const initial = readInitial();
  // Initial verdict is FROZEN for rendering — re-renders only on upgrade.
  const initialClassRef = useRef(initial.verdict.classification);
  const [state, setState] = useState<AppState>({
    verdict: initial.verdict,
    isReady: !initial.isFromServer,
    isFromServer: initial.isFromServer,
  });

  useEffect(() => {
    if (!initial.isFromServer) return;
    const stop = startBehaviorCollector();
    let cancelled = false;

    (async () => {
      try {
        // Solve the PoW challenge IN PARALLEL with fingerprint + behavior sampling.
        // The nonce is known immediately, so overlapping it keeps the hash chain off
        // the critical path (was: behavior window THEN challenge → dot lingered).
        // A failed solve must not take the whole verify down with it — post without
        // a proof and let the remaining signals speak.
        const challengePromise: Promise<string | undefined> = initial.verdict.challenge
          ? solveChallenge(initial.verdict.challenge).catch(() => undefined)
          : Promise.resolve(undefined);
        const [fp, behavior, challengeProof] = await Promise.all([
          collectFingerprint(),
          stop(),
          challengePromise,
        ]);
        if (cancelled) return;

        const challengeNonce = initial.verdict.challenge?.nonce;

        const signals: ClientSignals = { ...fp, ...behavior, challengeProof, challengeNonce };
        const csrf = initial.verdict.csrf ?? '';

        const resp = await fetch(EVENT_ENDPOINT, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-csrf-token': csrf,
            'x-sw-verified': hasVerifiedSw() ? '1' : '0',
          },
          credentials: 'include',
          body: JSON.stringify(signals),
        });
        if (!resp.ok) throw new Error(`event ${resp.status}`);
        const verdict = (await resp.json()) as Verdict;
        if (cancelled) return;

        // SW register on human verdict (background, doesn't affect render)
        if (verdict.classification === 'human') {
          void ensureServiceWorker();
        }

        // CRITICAL: only re-render if verify produced a strict UPGRADE.
        // Same or worse → keep current UI (no flash).
        const initialRank = RANK[initialClassRef.current] ?? 0;
        const newRank = RANK[verdict.classification] ?? 0;
        if (newRank > initialRank) {
          initialClassRef.current = verdict.classification;
          setState({ verdict, isReady: true, isFromServer: true });
        } else {
          // Keep verdict object updated (for reveal mode / analytics)
          // but DO NOT change classification — current UI stays.
          setState((s) => ({
            ...s,
            verdict: { ...verdict, classification: initialClassRef.current },
            isReady: true,
          }));
        }
      } catch {
        if (cancelled) return;
        setState((s) => ({ ...s, isReady: true }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

function hasVerifiedSw(): boolean {
  try {
    return localStorage.getItem('__sw_v') === '1';
  } catch {
    return false;
  }
}
