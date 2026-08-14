// Fallback routing for hosting WITHOUT the Cloudflare Worker (e.g. Vercel).
//
// Normally workers/edge.ts classifies the visitor and injects
// window.__INITIAL_STATE__, and that verdict decides which page renders.
// On plain static hosting nothing is injected, so there is nobody to classify
// anyone — the page is chosen by path instead:
//
//   /meta, /meta-funnel, /insta-funnel, ...  → offer page (MoneyPage)
//   everything else (incl. "/")              → safe page (SafePage)
//
// Note this is NOT cloaking: on static hosting every visitor hitting a money
// path sees the offer, reviewers and crawlers included. The Worker deploy is
// unaffected — an injected verdict always wins over this fallback.

import type { Classification } from './state';

const MONEY_PATHS = new Set([
  '/meta',
  '/meta-funnel',
  '/insta-funnel',
  '/tiktok-funnel',
]);

export function classifyByPath(pathname: string): Classification {
  return MONEY_PATHS.has(normalisePath(pathname)) ? 'human' : 'bot';
}

// Footer subpages. These render their own component regardless of any verdict —
// a visitor who opens /reviews wants the reviews page, not a classification.
// Keep in sync with FOOTER_LINKS in ../pages/shared.tsx and ROUTES in
// bin/emit-routes.mjs.
export const SUB_PATHS = [
  'payouts',
  'past-performance',
  'reviews',
  'contract',
  'referral-program',
  'partner-portal',
  'google-funnel',
  // Free-account offer lander, message-matched to the reference funnel. Renders
  // its own page for whoever asks; the offer promise ("free challenge, pay only
  // after payout") differs from /meta, but the questionnaire behind it is the
  // same. Cloaked from bots and reviewers at the edge (workers/edge.ts →
  // isMoneyOnlyPath) and backstopped in middleware.ts, exactly like /thank-you.
  'freeaccount',
  // Nie jest w stopce ani w żadnej nawigacji: trafia tu wyłącznie przyjęty
  // aplikant, przerzucony z formularza. Bramkowana w middleware.ts razem ze
  // ścieżkami ofertowymi — bez klucza brzegowego oddaje /safe.
  'thank-you',
] as const;

export type SubPageKey = (typeof SUB_PATHS)[number];

export function subPageFor(pathname: string): SubPageKey | null {
  const slug = normalisePath(pathname).slice(1);
  return (SUB_PATHS as readonly string[]).includes(slug) ? (slug as SubPageKey) : null;
}

// /pay/<token> — jedno zamówienie, jeden klient, jeden link wysłany mu ręcznie.
// Nie przechodzi przez normalisePath, bo ten sprowadza ścieżkę do małych liter,
// a token jest urlsafe-base64 i rozróżnia wielkość znaków: "aB" i "ab" to dwa
// różne zamówienia. Kształt sprawdzamy tutaj, żeby /pay/cokolwiek nie ładowało
// strony płatności tylko po to, by pokazać na niej błąd.
export function payTokenFor(pathname: string): string | null {
  const m = /^\/pay\/([A-Za-z0-9_-]{16,64})\/?$/.exec(pathname);
  return m ? m[1] : null;
}

function normalisePath(pathname: string): string {
  return pathname.replace(/\.html$/i, '').replace(/\/+$/, '').toLowerCase() || '/';
}
