// Emits a real HTML file for every money route, so paid-traffic slugs work on
// plain static hosting (Vercel) without depending on rewrite rules.
//
// Why not a rewrite: with `cleanUrls: true` Vercel stops exposing /index.html
// as a routable destination, so `{"source":"/meta","destination":"/index.html"}`
// falls through to the 404 page. A file on disk always wins.
//
// Each copy is byte-identical to index.html (same SPA shell, same pixel) except
// for the robots tag: the public page stays indexable, the offer pages do not
// belong in search results.

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

// Keep in sync with src/runtime/no-edge.ts (MONEY_PATHS).
const ROUTES = ['meta', 'meta-funnel', 'insta-funnel', 'google-funnel', 'tiktok-funnel'];

const shell = await readFile(join(DIST, 'index.html'), 'utf8');
const offerShell = shell.replace(
  /<meta name="robots" content="[^"]*" \/>/,
  '<meta name="robots" content="noindex, nofollow" />'
);

if (offerShell === shell) {
  console.warn('[emit-routes] robots meta tag not found in index.html — copies stay indexable');
}

for (const route of ROUTES) {
  await writeFile(join(DIST, `${route}.html`), offerShell);
}

console.log(`[emit-routes] wrote ${ROUTES.length} route shells: ${ROUTES.join(', ')}`);
