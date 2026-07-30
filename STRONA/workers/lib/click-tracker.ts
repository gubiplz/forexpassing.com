// Per-click tracking — heart of paid-traffic gating.
// Each ad platform appends a unique click identifier. First use → human;
// re-use within TTL → reviewer replaying URL from ad-platform dashboard.
//
// Per-source TTL tuned to platform review SLA:
//   Meta (fbclid):  24h — slowest reviewer cadence
//   Google (gclid): 12h
//   TikTok (ttclid): 6h
//
// Reused click ID is the strongest single signal that a reviewer is visiting.

import type { ReasonEntry, Env } from './types.ts';
import { verifyTrustedCookie, COOKIE_PRIMARY } from './cookies.ts';

const TTL_BY_SOURCE = {
  fb: 86_400,    // 24h
  g: 43_200,     // 12h
  tt: 21_600,    // 6h
} as const;

export function extractClickIds(url: URL): { fbclid?: string; gclid?: string; ttclid?: string } {
  const p = url.searchParams;
  return {
    fbclid: p.get('fbclid') ?? undefined,
    gclid: p.get('gclid') ?? p.get('gbraid') ?? p.get('wbraid') ?? undefined,
    ttclid: p.get('ttclid') ?? undefined,
  };
}

export function getCookie(headers: Headers, name: string): string | null {
  const raw = headers.get('cookie');
  if (!raw) return null;
  const parts = raw.split(/;\s*/);
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k === name) return v;
  }
  return null;
}

export interface ClickTrackResult {
  reasons: ReasonEntry[];
  shouldIssueCookie: boolean;
  hasValidTrustedCookie: boolean;
}

async function checkClick(
  env: Env,
  source: keyof typeof TTL_BY_SOURCE,
  id: string
): Promise<{ state: 'first' | 'reused'; agoSeconds?: number }> {
  const key = `${source}:${id}`;
  const seen = await env.USED_CLICKS.get(key);
  if (seen) {
    return { state: 'reused', agoSeconds: Math.floor((Date.now() - Number(seen)) / 1000) };
  }
  await env.USED_CLICKS.put(key, String(Date.now()), { expirationTtl: TTL_BY_SOURCE[source] });
  return { state: 'first' };
}

export async function trackClicks(
  url: URL,
  headers: Headers,
  env: Env,
  secret: string
): Promise<ClickTrackResult> {
  const reasons: ReasonEntry[] = [];
  const { fbclid, gclid, ttclid } = extractClickIds(url);
  const cookie = getCookie(headers, COOKIE_PRIMARY);

  // Trusted cookie shortcut
  if (cookie) {
    const valid = await verifyTrustedCookie(cookie, secret);
    if (valid) {
      reasons.push({
        code: 'trusted_cookie_valid',
        detail: `${COOKIE_PRIMARY} valid`,
        weight: 40,
      });
      return { reasons, shouldIssueCookie: false, hasValidTrustedCookie: true };
    }
    reasons.push({
      code: 'trusted_cookie_invalid',
      detail: `${COOKIE_PRIMARY} HMAC mismatch (tamper attempt?)`,
      weight: -30,
    });
  }

  let anyFirst = false;

  if (fbclid) {
    const r = await checkClick(env, 'fb', fbclid);
    if (r.state === 'first') {
      anyFirst = true;
      reasons.push({
        code: 'fbclid_first_use',
        detail: `fbclid=${fbclid.slice(0, 12)}… (first visit from Meta)`,
        weight: 60,
      });
    } else {
      reasons.push({
        code: 'fbclid_already_used',
        detail: `fbclid seen ${r.agoSeconds}s ago — reviewer replay`,
        weight: -90,
      });
    }
  }

  if (gclid) {
    const r = await checkClick(env, 'g', gclid);
    if (r.state === 'first') {
      anyFirst = true;
      reasons.push({
        code: 'gclid_first_use',
        detail: `gclid=${gclid.slice(0, 12)}… (first visit from Google Ads)`,
        weight: 60,
      });
    } else {
      reasons.push({
        code: 'gclid_already_used',
        detail: `gclid seen ${r.agoSeconds}s ago — reviewer replay`,
        weight: -90,
      });
    }
  }

  if (ttclid) {
    const r = await checkClick(env, 'tt', ttclid);
    if (r.state === 'first') {
      anyFirst = true;
      reasons.push({
        code: 'ttclid_first_use',
        detail: `ttclid=${ttclid.slice(0, 12)}… (first visit from TikTok)`,
        weight: 50,
      });
    } else {
      reasons.push({
        code: 'ttclid_already_used',
        detail: `ttclid seen ${r.agoSeconds}s ago — reviewer replay`,
        weight: -85,
      });
    }
  }

  if (!fbclid && !gclid && !ttclid && !cookie) {
    reasons.push({
      code: 'no_paid_traffic_param',
      detail: 'direct visit (no paid click ID, no trusted cookie)',
      weight: -50,
    });
  }

  return {
    reasons,
    shouldIssueCookie: anyFirst && !cookie,
    hasValidTrustedCookie: false,
  };
}
