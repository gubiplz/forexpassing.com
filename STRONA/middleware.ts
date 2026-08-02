// Origin-side backstop for the Cloudflare gate.
//
// The Worker at forexpassing.com classifies every visitor and injects
// window.__INITIAL_STATE__. This project is also reachable at its own
// *.vercel.app hostname, and a request arriving there carries no verdict:
// src/runtime/no-edge.ts then picks the page by path and hands the offer to
// everyone, ad reviewers included. That is a complete bypass of the gate.
//
// So the offer paths require proof that the request came through the Worker.
// Without it they render the safe page instead.
//
// ORIGIN_KEY must match the Worker secret of the same name. While it is unset
// this is a no-op, which is what lets the two systems be updated one at a time.

const GATED_PATHS = new Set([
  '/meta',
  '/meta-funnel',
  '/insta-funnel',
  '/tiktok-funnel',
  '/watch',
  '/thank-you',
  '/welcome',
]);

// Vercel reads this statically, so it has to stay a literal — keep it in sync
// with GATED_PATHS above. The .html twins are listed because cleanUrls only
// redirects them, and a redirect the middleware never saw is a way in.
export const config = {
  matcher: [
    '/meta',
    '/meta-funnel',
    '/insta-funnel',
    '/tiktok-funnel',
    '/watch',
    '/thank-you',
    '/welcome',
    '/meta.html',
    '/meta-funnel.html',
    '/insta-funnel.html',
    '/tiktok-funnel.html',
    '/watch.html',
    '/thank-you.html',
    '/welcome.html',
  ],
};

export default function middleware(request: Request): Response {
  const key = process.env.ORIGIN_KEY;
  if (!key) return proceed();

  const url = new URL(request.url);
  const path = url.pathname.replace(/\.html$/i, '').replace(/\/+$/, '').toLowerCase() || '/';
  if (!GATED_PATHS.has(path)) return proceed();

  if (timingSafeEqual(request.headers.get('x-edge-key') ?? '', key)) return proceed();

  // Rewrite, not redirect: the address bar must not change, or the bypass
  // attempt announces itself as a /safe URL.
  return new Response(null, {
    headers: { 'x-middleware-rewrite': new URL('/safe', url).toString() },
  });
}

function proceed(): Response {
  return new Response(null, { headers: { 'x-middleware-next': '1' } });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
