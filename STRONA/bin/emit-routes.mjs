// Emits a real HTML file for every SPA route, so paid-traffic slugs and the
// footer subpages work on plain static hosting (Vercel) without rewrite rules.
//
// Why not a rewrite: with `cleanUrls: true` Vercel stops exposing /index.html
// as a routable destination, so `{"source":"/meta","destination":"/index.html"}`
// falls through to the 404 page. A file on disk always wins.
//
// Each copy is the same SPA shell (same bundle, same pixel); only the <head>
// differs — a per-page title and description, and robots set to noindex. These
// pages exist to be linked from the funnel, not to be found in search.

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

// Ad slugs — all render the money page. Keep in sync with MONEY_PATHS in
// src/runtime/no-edge.ts.
const MONEY_ROUTES = ['meta', 'meta-funnel', 'insta-funnel', 'google-funnel', 'tiktok-funnel'];

// Footer subpages. Keep in sync with SUB_PATHS in src/runtime/no-edge.ts and
// FOOTER_LINKS in src/pages/shared.tsx.
const SUB_ROUTES = {
  payouts: {
    title: 'Client payouts — Forex Passing',
    description:
      'Certificates our partner prop firm issued to Forex Passing clients: payouts released, evaluations passed, accounts funded.',
  },
  'past-performance': {
    title: 'Past performance — Forex Passing',
    description:
      'Equity curve, monthly returns and the trade log behind the accounts we manage. Past performance does not predict future results.',
  },
  reviews: {
    title: 'Reviews — Forex Passing',
    description: 'What clients say after we have run an evaluation or a funded account for them.',
  },
  contract: {
    title: 'The contract — Forex Passing',
    description:
      'What the management agreement covers before you apply: who trades, the split, the guarantee, and how you end it.',
  },
  'referral-program': {
    title: 'Referral program — Forex Passing',
    description:
      'Send someone in, earn on every payout they receive. Three tiers, no earnings cap, tier status is permanent.',
  },
};

const shell = await readFile(join(DIST, 'index.html'), 'utf8');

const noindex = (html) =>
  html.replace(
    /<meta name="robots" content="[^"]*" \/>/,
    '<meta name="robots" content="noindex, follow" />'
  );

const offerShell = noindex(shell);
if (offerShell === shell) {
  console.warn('[emit-routes] robots meta tag not found in index.html — copies stay indexable');
}

for (const route of MONEY_ROUTES) {
  await writeFile(join(DIST, `${route}.html`), offerShell);
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

for (const [route, meta] of Object.entries(SUB_ROUTES)) {
  const title = escape(meta.title);
  const description = escape(meta.description);
  const html = noindex(shell)
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/s,
      `<meta name="description" content="${description}" />`
    )
    .replace(
      /<meta property="og:title" content="[^"]*" \/>/,
      `<meta property="og:title" content="${title}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/s,
      `<meta property="og:description" content="${description}" />`
    );
  await writeFile(join(DIST, `${route}.html`), html);
}

const all = [...MONEY_ROUTES, ...Object.keys(SUB_ROUTES)];
console.log(`[emit-routes] wrote ${all.length} route shells: ${all.join(', ')}`);
