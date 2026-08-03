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
    try {
      return await handleRequest(request, env, ctx);
    } catch {
      // An uncaught throw surfaces Cloudflare's branded 1101 page, which breaks the
      // site and announces that something sits in front of the origin. Fail closed:
      // on error the visitor gets the safe page, never the offer.
      return serveFailClosed(request, env);
    }
  },
} satisfies ExportedHandler<Env>;

async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);

  // Plain http is not a secure context, so Safari and Brave leave crypto.subtle
  // undefined. The client then throws while solving the PoW challenge, never
  // posts /api/event, and sits on the boot skeleton forever. Redirect before any
  // classification runs — nothing downstream works over http anyway (the __csrf
  // cookie is Secure, so it is dropped too).
  if (url.protocol === 'http:') {
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 308);
  }

  // ─── API routing ─────────────────────────────────────
  if (url.pathname === '/api/event') {
    return handleEvent(request, env);
  }
  if (url.pathname === '/api/event/subscribe') {
    // The origin owns this endpoint whenever there is one: its version also
    // sends the qualified/rejected emails and pushes the lead to Telegram.
    // The Worker fallback only writes the lead to KV, so intercepting here
    // would silently drop every application email.
    if (env.ORIGIN_URL) return proxyToOrigin(request, env.ORIGIN_URL, env.ORIGIN_KEY);
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

  // ─── Static assets ───────────────────────────────────
  // In ASSETS mode run_worker_first keeps these off the Worker entirely; in
  // ORIGIN mode everything lands here, so skip the pipeline explicitly. A JS
  // or font request carries no verdict worth spending KV reads and a PoW
  // challenge on, and gating it would only break the page it belongs to.
  if (isStaticAsset(url.pathname)) {
    return fetchAsset(request, env);
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

  // HTTP protocol fingerprint. Kept as an observation, not a penalty: in the
  // edge log it fired on 23 of 23 real phone visits and on none of the scripted
  // bots, because carrier networks downgrade to HTTP/1.1 while a scripted client
  // happily speaks HTTP/2. A signal that only ever hits real users is inverted.
  if (cf?.httpProtocol === 'HTTP/1.1') {
    reasons.push({
      code: 'http_protocol_old',
      detail: 'HTTP/1.1 (common on mobile carriers — observation only)',
      weight: 0,
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
  // injectState grew the body past the origin's count; a declared length that
  // contradicts the body is both wrong and a fingerprint of a rewriting proxy.
  headers.delete('content-length');
  // Standard marketing-page cache policy (private + must-revalidate is enough,
  // triple-no-cache looks like a banking dashboard and stands out).
  headers.set('cache-control', 'private, max-age=0, must-revalidate');
  headers.set('vary', 'Cookie, Accept-Encoding');
  for (const c of setCookieHeaders) headers.append('set-cookie', c);

  return new Response(injected, { status: assetResponse.status, headers });
}

// Last resort when the pipeline throws. Serving the origin unmodified is not an
// option: with no injected state the SPA falls back to path routing and hands the
// offer to everyone, reviewers included. So the fallback is the safe page.
async function serveFailClosed(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }
  try {
    const safeReq = new Request(new URL('/safe', url).toString(), request);
    const safeResponse = await fetchAsset(safeReq, env);
    const headers = new Headers(safeResponse.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    headers.delete('content-length');
    headers.set('cache-control', 'private, max-age=0, must-revalidate');
    return new Response(safeResponse.body, { status: 200, headers });
  } catch {
    return new Response('Service temporarily unavailable', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}

async function fetchAsset(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (env.ASSETS) {
    // SPA fallback for funnel slugs — rewrite request path to root so [assets]
    // returns index.html (which Worker then transforms with verdict injection).
    // ORIGIN mode needs no fallback: bin/emit-routes.mjs writes a real HTML file
    // per slug, and rewriting to "/" there would serve the indexable root page
    // (different title, robots: index) under an ad slug.
    if (detectFunnel(url.pathname)) {
      const indexReq = new Request(new URL('/', url).toString(), request);
      return env.ASSETS.fetch(indexReq);
    }
    return env.ASSETS.fetch(request);
  }
  if (env.ORIGIN_URL) return proxyToOrigin(request, env.ORIGIN_URL, env.ORIGIN_KEY);
  return new Response('No assets binding configured', { status: 500 });
}

async function proxyToOrigin(
  request: Request,
  originUrl: string,
  originKey?: string
): Promise<Response> {
  const url = new URL(request.url);
  const origin = new URL(originUrl);
  const target = new URL(url.pathname + url.search, origin);

  const headers = new Headers(request.headers);
  // Strip any client-supplied copy before setting our own, so a visitor cannot
  // forge the proof by sending the header themselves.
  headers.delete('x-edge-key');
  if (originKey) headers.set('x-edge-key', originKey);
  // The origin only answers to its own hostname — forwarding the public Host
  // gets the request denied at the origin edge before it ever reaches the app.
  headers.set('host', origin.host);
  // Cloudflare-internal headers would tell the origin it sits behind this Worker.
  for (const h of ['cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'cf-worker']) {
    headers.delete(h);
  }
  // Let the origin negotiate encoding with us rather than replaying the
  // client's list — the HTML body has to be decodable here for injectState().
  headers.delete('accept-encoding');

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const originResponse = await fetch(target.toString(), {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    // Redirects must reach the browser so the address bar follows them; if the
    // Worker resolved them itself the origin URL would end up user-visible.
    redirect: 'manual',
  });

  const responseHeaders = new Headers(originResponse.headers);
  // Naming the origin defeats the whole gate: a reviewer who reads these can
  // request the origin hostname directly and get the uncloaked site.
  responseHeaders.delete('server');
  responseHeaders.delete('x-vercel-cache');
  responseHeaders.delete('x-vercel-id');
  responseHeaders.delete('x-vercel-error');
  responseHeaders.delete('x-matched-path');
  responseHeaders.delete('content-disposition');

  const location = responseHeaders.get('location');
  if (location) {
    // Rewrite absolute redirects that point back at the origin host, otherwise
    // a single redirect hands the visitor the real origin hostname.
    const resolved = new URL(location, target);
    if (resolved.host === origin.host) {
      resolved.protocol = url.protocol;
      resolved.host = url.host;
      responseHeaders.set('location', resolved.toString());
    }
  }

  return new Response(originResponse.body, {
    status: originResponse.status,
    statusText: originResponse.statusText,
    headers: responseHeaders,
  });
}

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith('/assets/')) return true;
  return /\.(js|mjs|css|map|png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf|mp4|webm|txt|xml|webmanifest)$/i.test(
    pathname
  );
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
  const stateTag = `<script>window.__INITIAL_STATE__=${payload};</script>`;

  let out = html;
  let csrfMeta = verdict.csrf ? `<meta name="csrf" content="${escapeAttr(verdict.csrf)}">` : '';
  // index.html ships an empty csrf placeholder. Appending a second tag before
  // </head> leaves the empty one first in document order, and the client reads
  // it with querySelector — so every real browser posted a blank token, scored
  // csrf_missing and could never upgrade to human. Fill the placeholder instead.
  if (csrfMeta) {
    const placeholder = /<meta\s+name="csrf"\s+content=""\s*\/?>/i;
    if (placeholder.test(out)) {
      out = out.replace(placeholder, csrfMeta);
      csrfMeta = '';
    }
  }

  const inject = `${csrfMeta}${stateTag}`;
  if (out.includes('</head>')) {
    return out.replace('</head>', `${inject}</head>`);
  }
  return inject + out;
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
