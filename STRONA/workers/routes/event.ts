// POST /api/event — client posts fingerprint + behavior + optional challenge proof.
// Server replays full classification pipeline + validates CSRF + verifies challenge.

import type { Env, ClientSignals, Verdict, ReasonEntry } from '../lib/types.ts';
import { scoreClientSignals, buildVerdict } from '../lib/scorer.ts';
import { analyzeReputation } from '../lib/reputation.ts';
import { analyzeUserAgent } from '../lib/ua-analyzer.ts';
import { analyzeTls, tzCountryMismatch } from '../lib/tls-fingerprint.ts';
import { analyzeGeo } from '../lib/geo-gate.ts';
import { trackClicks } from '../lib/click-tracker.ts';
import { buildCookieHeaders, buildRequestId } from '../lib/cookies.ts';
import { verifyCsrf, readCsrfCookie } from '../lib/csrf.ts';
import { verifyChallenge } from '../lib/challenge.ts';
import { appendLog } from '../lib/log.ts';

export async function handleEvent(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'method not allowed' }, 405);
  }

  // CSRF gate
  const csrfHeader = request.headers.get('x-csrf-token') ?? '';
  const csrfCookie = readCsrfCookie(request.headers);
  let csrfReason: ReasonEntry;
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    csrfReason = {
      code: 'csrf_missing',
      detail: 'X-Csrf-Token missing or mismatched with __csrf cookie',
      weight: -40,
    };
  } else {
    const valid = await verifyCsrf(csrfHeader, env.EDGE_SECRET);
    csrfReason = valid
      ? { code: 'csrf_valid', detail: 'CSRF chain valid', weight: 15 }
      : { code: 'csrf_invalid', detail: 'CSRF HMAC mismatch', weight: -60 };
  }

  let signals: ClientSignals;
  try {
    signals = (await request.json()) as ClientSignals;
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }

  const url = new URL(request.url);
  const cf = (request as Request & { cf?: unknown }).cf as Parameters<
    typeof analyzeReputation
  >[0];

  const reasons: ReasonEntry[] = [csrfReason];
  reasons.push(...analyzeReputation(cf));
  reasons.push(...analyzeUserAgent(request.headers));
  reasons.push(...analyzeTls(cf));
  reasons.push(...analyzeGeo(cf));

  const clickResult = await trackClicks(url, request.headers, env, env.EDGE_SECRET);
  reasons.push(...clickResult.reasons);

  reasons.push(...scoreClientSignals(signals));

  // Service Worker presence — persistent verification from prior visit
  if (request.headers.get('x-sw-verified') === '1') {
    reasons.push({
      code: 'sw_verified_header',
      detail: 'Service Worker present (prior verified session)',
      weight: 30,
    });
  }

  if (cf?.country && signals.timezone && tzCountryMismatch(cf.country, signals.timezone)) {
    reasons.push({
      code: 'tz_country_mismatch',
      detail: `country=${cf.country} but client TZ=${signals.timezone}`,
      weight: -25,
    });
  }

  // Verify JS challenge. Client must echo the nonce we issued (signals.challengeNonce)
  // plus the computed proof. Server replays via HMAC-bound stateless check.
  if (signals.challengeProof) {
    const ip0 = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
    const ua0 = request.headers.get('user-agent') ?? '';
    const reqId = await buildRequestId(ip0, ua0);
    const ok = await verifyChallenge(env, reqId, signals.challengeNonce, signals.challengeProof);
    reasons.push(
      ok
        ? { code: 'challenge_solved', detail: 'PoW chain valid', weight: 50 }
        : { code: 'challenge_failed', detail: 'PoW chain invalid', weight: -80 }
    );
  }

  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  const ua = request.headers.get('user-agent') ?? '';
  const requestId = await buildRequestId(ip, ua);
  const verdict: Verdict = buildVerdict(reasons, requestId, false);

  const headers = new Headers({ 'content-type': 'application/json' });

  if (
    (verdict.classification === 'human' || verdict.classification === 'suspicious') &&
    clickResult.shouldIssueCookie
  ) {
    const cookies = await buildCookieHeaders(env.EDGE_SECRET);
    for (const c of cookies) headers.append('set-cookie', c);
    verdict.cookieIssued = true;
  }

  await appendLog(env, {
    ts: Date.now(),
    requestId,
    classification: verdict.classification,
    score: verdict.score,
    reasons: verdict.reasons.map((r) => ({ code: r.code, detail: r.detail, weight: r.weight })),
    ctx: {
      country: cf?.country,
      asn: cf?.asn,
      asOrg: cf?.asOrganization,
      uaShort: ua.slice(0, 80),
      path: url.pathname,
      hasFbclid: url.searchParams.has('fbclid'),
      hasGclid: url.searchParams.has('gclid'),
      hasTtclid: url.searchParams.has('ttclid'),
    },
  });

  return new Response(JSON.stringify(verdict), { status: 200, headers });
}

// Decoy endpoint — POST /api/event/subscribe used by SafePage newsletter form.
export async function handleSubscribe(request: Request, _env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  return json({ ok: true, queued: true });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
