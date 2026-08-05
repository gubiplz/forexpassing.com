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
    const parsed = await request.json();
    // Valid JSON is not enough — `null`, a bare string or an array all parse fine
    // and would then throw on the first field read further down.
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return json({ error: 'invalid payload' }, 400);
    }
    signals = parsed as ClientSignals;
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

  reasons.push(...scoreClientSignals(signals, request.headers.get('user-agent') ?? ''));

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

// POST /api/event/subscribe — lead form on the safe page. Honeypot-gated (not CSRF:
// the static safe.html/about-us.html are served raw without an injected CSRF token).
// Stores the lead in KV and, if LEAD_WEBHOOK is set, forwards it (e.g. Make.com → email).
export async function handleSubscribe(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }

  // Honeypot — real users never fill the hidden `company` field. Bots do. Drop silently.
  const honeypot = str(body.company);
  if (honeypot) return json({ ok: true });

  const name = str(body.name).slice(0, 120);
  const email = str(body.email).slice(0, 200);
  const experience = str(body.experience).slice(0, 40);
  const goal = str(body.goal).slice(0, 2000);

  // Application questionnaire (money page). Optional — the safe-page form only
  // sends name/email/experience/goal, so every extra field defaults to ''.
  const phone = str(body.phone).slice(0, 40);
  const country = str(body.country).slice(0, 80);
  const propFirm = str(body.propFirm).slice(0, 80);
  const accountSize = str(body.accountSize).slice(0, 40);
  const stage = str(body.stage).slice(0, 40);
  const source = str(body.source).slice(0, 40);

  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'invalid' }, 400);
  }

  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  const ua = (request.headers.get('user-agent') ?? '').slice(0, 200);
  const lead = {
    ts: Date.now(),
    name,
    email,
    phone,
    country,
    propFirm,
    accountSize,
    stage,
    experience,
    goal,
    source,
    ip,
    ua,
  };

  const key = `lead:${lead.ts}:${crypto.randomUUID().slice(0, 8)}`;
  await env.EDGE_LOG.put(key, JSON.stringify(lead));

  if (env.LEAD_WEBHOOK) {
    try {
      await fetch(env.LEAD_WEBHOOK, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(lead),
      });
    } catch {
      // Delivery is best-effort — the lead is already persisted in KV.
    }
  }

  // `hq: false` always. There is no grader on this path — it lives in the Vercel
  // function (api/_lib/lead-quality.js) — and this handler also drops the
  // answers the grader reads, so there is nothing here to score. Saying so
  // explicitly keeps the response shape identical to the origin's and leaves the
  // applicant on the confirmation the form already shows, rather than sending
  // them to a page we cannot say they earned.
  return json({ ok: true, hq: false });
}

// POST /api/lead — post-purchase onboarding form on the welcome page. The buyer
// gives their name, Telegram handle and purchase email so we can reach out on
// Telegram. Honeypot-gated; stored in KV and forwarded to LEAD_WEBHOOK if set
// (e.g. Make.com → instant Telegram/email notification).
export async function handleOnboard(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }

  // Honeypot — real users never fill the hidden `company` field. Bots do. Drop silently.
  const honeypot = str(body.company);
  if (honeypot) return json({ ok: true });

  const name = str(body.name).slice(0, 120);
  const telegram = str(body.telegram).slice(0, 80);
  const email = str(body.email).slice(0, 200);
  const plan = str(body.plan).slice(0, 40);

  if (!name || !telegram || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: 'invalid' }, 400);
  }

  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  const ua = (request.headers.get('user-agent') ?? '').slice(0, 200);
  const lead = { kind: 'onboard', ts: Date.now(), name, telegram, email, plan, ip, ua };

  const key = `onboard:${lead.ts}:${crypto.randomUUID().slice(0, 8)}`;
  await env.EDGE_LOG.put(key, JSON.stringify(lead));

  if (env.LEAD_WEBHOOK) {
    try {
      await fetch(env.LEAD_WEBHOOK, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(lead),
      });
    } catch {
      // Delivery is best-effort — the lead is already persisted in KV.
    }
  }

  return json({ ok: true });
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
