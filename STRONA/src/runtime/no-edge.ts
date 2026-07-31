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
  '/google-funnel',
  '/tiktok-funnel',
]);

export function classifyByPath(pathname: string): Classification {
  const p = pathname.replace(/\/+$/, '').toLowerCase() || '/';
  return MONEY_PATHS.has(p) ? 'human' : 'bot';
}
