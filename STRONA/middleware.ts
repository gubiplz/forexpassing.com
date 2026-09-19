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
  '/freeaccount',
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
    '/freeaccount',
    '/meta.html',
    '/meta-funnel.html',
    '/insta-funnel.html',
    '/tiktok-funnel.html',
    '/watch.html',
    '/thank-you.html',
    '/welcome.html',
    '/freeaccount.html',
  ],
};

// Budziki automatyzacji odpalane RUCHEM, nie zegarem.
//
// Konto jest na planie Hobby, gdzie sa dwa sloty crona na cale konto i oba
// zajmuje panel (`/api/tick`, `/api/cron/streak-reminder`). Zamiast dokladac
// zewnetrzny scenariusz, korzystamy z tego, ze middleware widzi kazde wejscie
// na lejek — ten sam wzorzec, ktorym panel odpala payout bota z ruchu strony.
//
// Oba adresy sa idempotentne i maja wlasny throttle po stronie funkcji; to
// ponizej jest tylko zgruba sitem, zeby nie robic fetcha przy kazdym zadaniu.
const BUDZIKI = ['/api/spots-ping', '/api/trackrecord-beat'];
const ODSTEP_MS = 60_000;
let ostatniPuls = 0;

function puls(request: Request, context?: { waitUntil?: (p: Promise<unknown>) => void }): void {
  const teraz = Date.now();
  if (teraz - ostatniPuls < ODSTEP_MS) return;
  ostatniPuls = teraz;

  for (const sciezka of BUDZIKI) {
    // Bez await: odpowiedz dla czlowieka nie moze czekac na Telegrama.
    // `waitUntil` pilnuje, zeby edge nie ucial zadania po zwroceniu odpowiedzi.
    const zadanie = fetch(new URL(sciezka, request.url), {
      headers: { 'x-puls': '1' },
    }).catch(() => {});
    context?.waitUntil?.(zadanie);
  }
}

export default function middleware(
  request: Request,
  context?: { waitUntil?: (p: Promise<unknown>) => void },
): Response {
  // Puls idzie PRZED bramka i niezaleznie od jej wyniku: interesuje nas sam
  // fakt ruchu, a nie to, czy odwiedzajacy zobaczy oferte czy strone bezpieczna.
  puls(request, context);

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
