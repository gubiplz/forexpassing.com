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
] as const;

export type SubPageKey = (typeof SUB_PATHS)[number];

export function subPageFor(pathname: string): SubPageKey | null {
  const slug = normalisePath(pathname).slice(1);
  return (SUB_PATHS as readonly string[]).includes(slug) ? (slug as SubPageKey) : null;
}

function normalisePath(pathname: string): string {
  return pathname.replace(/\.html$/i, '').replace(/\/+$/, '').toLowerCase() || '/';
}
