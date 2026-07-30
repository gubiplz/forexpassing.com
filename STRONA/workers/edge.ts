// Edge runtime — primary request handler.
// Pipelines: reputation → UA/CH → TLS → geo → click tracking → verdict,
// then serves either money page or safe page via single-bundle gate.

import type { Env, Verdict, ReasonEntry } from './lib/types.ts';
import { analyzeReputation } from './lib/reputation.ts';
import { analyzeUserAgent } from './lib/ua-analyzer.ts';
import { analyzeTls } from './lib/tls-fingerprint.ts';
import { analyzeGeo } from './lib/geo-gate.ts';
import { trackClicks, extractClickIds } from './lib/click-tracker.ts';
import { detectFunnel, scoreFunnel } from './lib/funnel.ts';
import { buildCookieHeaders, buildRequestId } from './lib/cookies.ts';
import { mintCsrf, buildCsrfCookie } from './lib/csrf.ts';
import { buildChallenge, shouldIssueChallenge } from './lib/challenge.ts';
import { buildVerdict } from './lib/scorer.ts';
import { appendLog } from './lib/log.ts';
import { handleEvent, handleSubscribe, handleOnboard } from './routes/event.ts';
import { handleEdgeLog } from './routes/edge-log.ts';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ─── API routing ─────────────────────────────────────
    if (url.pathname === '/api/event') {
      return handleEvent(request, env);
    }
    if (url.pathname === '/api/event/subscribe') {
      return handleSubscribe(request, env);
    }
    if (url.pathname === '/api/lead') {
      return handleOnboard(request, env);
    }
    if (url.pathname === '/api/__edge/log') {
      return handleEdgeLog(request, env);
    }
    if (url.pathname === '/v1/migration/portal') {
      ctx.waitUntil(logHoneypot(request, env));
      // Return 404 — bot thinks the URL is broken, doesn't realize it was logged
      return new Response('Not Found', { status: 404, headers: { 'content-type': 'text/plain' } });
    }

    // ─── Classification pipeline ─────────────────────────
    const cf = (request as Request & { cf?: unknown }).cf as Parameters<
      typeof analyzeReputation
    >[0];

    const reasons: ReasonEntry[] = [];
    reasons.push(...analyzeReputation(cf));
    reasons.push(...analyzeUserAgent(request.headers));
    reasons.push(...analyzeTls(cf));
    reasons.push(...analyzeGeo(cf));

    // HTTP protocol fingerprint — real Chrome on CF gets HTTP/2 or HTTP/3
    if (cf?.httpProtocol && cf.httpProtocol === 'HTTP/1.1') {
      reasons.push({
        code: 'http_protocol_old',
        detail: `HTTP/1.1 (modern browsers negotiate H2/H3)`,
        weight: -20,
      });
    }

    const clickResult = await trackClicks(url, request.headers, env, env.EDGE_SECRET);
    reasons.push(...clickResult.reasons);

    // Funnel slug attribution (/meta-funnel etc.)
    const funnelSource = detectFunnel(url.pathname);
    const clickIds = extractClickIds(url);
    const hasClickId = !!(clickIds.fbclid || clickIds.gclid || clickIds.ttclid);
    reasons.push(...scoreFunnel(funnelSource, hasClickId));

    // SW verified header — persistent verification from prior visit
    if (request.headers.get('x-sw-verified') === '1') {
      reasons.push({
        code: 'sw_verified_header',
        detail: 'Service Worker (prior session)',
        weight: 30,
      });
    }

    const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
    const ua = request.headers.get('user-agent') ?? '';
    const requestId = await buildRequestId(ip, ua);
    const verdict: Verdict = buildVerdict(reasons, requestId, false);

    // Issue cookies on positive verdict + first click
    const setCookieHeaders: string[] = [];
    if (
      (verdict.classification === 'human' || verdict.classification === 'suspicious') &&
      clickResult.shouldIssueCookie
    ) {
      const cookies = await buildCookieHeaders(env.EDGE_SECRET);
      setCookieHeaders.push(...cookies);
      verdict.cookieIssued = true;
    }

    // CSRF token always issued (used by POST /api/event)
    const csrf = await mintCsrf(env.EDGE_SECRET, requestId);
    verdict.csrf = csrf;
    setCookieHeaders.push(buildCsrfCookie(csrf));

    // Challenge for suspicious classification
    if (shouldIssueChallenge(verdict.score, clickResult.hasValidTrustedCookie)) {
      verdict.challenge = await buildChallenge(env, requestId);
    }

    // Async log
    ctx.waitUntil(
      appendLog(env, {
        ts: Date.now(),
        requestId,
        classification: verdict.classification,
        score: verdict.score,
        reasons: verdict.reasons.map((r) => ({
          code: r.code,
          detail: r.detail,
          weight: r.weight,
        })),
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
      })
    );

    // ─── Money-only subpages: hide from bots & reviewers ──
    // /watch, /thank-you and /welcome are standalone pages (not the SPA), so they cannot
    // swap money/safe client-side. Gate them at the edge: bots and reviewers
    // get the clean safe page; humans (and borderline-suspicious) get the page.
    if (
      isMoneyOnlyPath(url.pathname) &&
      (verdict.classification === 'bot' || verdict.classification === 'reviewer')
    ) {
      // Fetch the extensionless canonical path: Cloudflare Assets 307-redirects
      // `/safe.html` → `/safe` with an empty body, which would serve a blank page.
      const safeReq = new Request(new URL('/safe', url).toString(), request);
      const safeResponse = await fetchAsset(safeReq, env);
      const safeHeaders = new Headers(safeResponse.headers);
      safeHeaders.set('content-type', 'text/html; charset=utf-8');
      safeHeaders.set('cache-control', 'private, max-age=0, must-revalidate');
      safeHeaders.set('vary', 'Cookie, Accept-Encoding');
      return new Response(safeResponse.body, { status: 200, headers: safeHeaders });
    }

    // ─── Serve ───────────────────────────────────────────
    const assetResponse = await fetchAsset(request, env);
    const ct = assetResponse.headers.get('content-type') ?? '';
    if (!ct.includes('text/html')) {
      if (setCookieHeaders.length > 0) {
        const headers = new Headers(assetResponse.headers);
        for (const c of setCookieHeaders) headers.append('set-cookie', c);
        return new Response(assetResponse.body, { status: assetResponse.status, headers });
      }
      return assetResponse;
    }

    const html = await assetResponse.text();
    const injected = injectState(html, verdict);

    const headers = new Headers(assetResponse.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    // Standard marketing-page cache policy (private + must-revalidate is enough,
    // triple-no-cache looks like a banking dashboard and stands out).
    headers.set('cache-control', 'private, max-age=0, must-revalidate');
    headers.set('vary', 'Cookie, Accept-Encoding');
    for (const c of setCookieHeaders) headers.append('set-cookie', c);

    return new Response(injected, { status: assetResponse.status, headers });
  },
} satisfies ExportedHandler<Env>;

async function fetchAsset(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  // SPA fallback for funnel slugs — rewrite request path to root so [assets]
  // returns index.html (which Worker then transforms with verdict injection).
  if (detectFunnel(url.pathname)) {
    const indexUrl = new URL('/', url);
    const indexReq = new Request(indexUrl.toString(), request);
    if (env.ASSETS) return env.ASSETS.fetch(indexReq);
  }
  if (env.ASSETS) return env.ASSETS.fetch(request);
  if (env.ORIGIN_URL) {
    const target = new URL(url.pathname + url.search, env.ORIGIN_URL);
    return fetch(target.toString(), { method: request.method, headers: request.headers });
  }
  return new Response('No assets binding configured', { status: 500 });
}

function isMoneyOnlyPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  return (
    p === '/watch' ||
    p === '/watch.html' ||
    p === '/thank-you' ||
    p === '/thank-you.html' ||
    p === '/welcome' ||
    p === '/welcome.html'
  );
}

function injectState(html: string, verdict: Verdict): string {
  // OPSEC: ship ONLY the minimum the SPA needs to decide its render path
  // and authenticate the verify POST. NEVER expose reasons/scores/weights —
  // those leak the entire classifier ruleset to anyone with curl + grep.
  const publicState = {
    c: verdict.classification,
    r: verdict.requestId,
    // Challenge is sent to client only when needed; keep it opaque
    h: verdict.challenge ?? null,
  };
  const payload = JSON.stringify(publicState).replaceAll('</', '<\\/');
  const csrfMeta = verdict.csrf
    ? `<meta name="csrf" content="${escapeAttr(verdict.csrf)}">`
    : '';
  const stateTag = `<script>window.__INITIAL_STATE__=${payload};</script>`;
  const inject = `${csrfMeta}${stateTag}`;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${inject}</head>`);
  }
  return inject + html;
}

function escapeAttr(s: string): string {
  return s.replace(/[&"<>]/g, (c) =>
    ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c] ?? c
  );
}

async function logHoneypot(request: Request, env: Env): Promise<void> {
  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  const ua = request.headers.get('user-agent') ?? '';
  const requestId = await buildRequestId(ip, ua);
  await appendLog(env, {
    ts: Date.now(),
    requestId,
    classification: 'bot',
    score: -100,
    reasons: [
      { code: 'honeypot_triggered', detail: 'trap hit', weight: -100 },
    ],
    ctx: {
      uaShort: ua.slice(0, 80),
      path: '/v1/migration/portal',
      hasFbclid: false,
      hasGclid: false,
    },
  });
}
