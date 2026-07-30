// Service Worker — persistent verification marker.
// Registered post-verification, intercepts root navigations and adds
// X-Sw-Verified header so edge can trust the visitor on next visits.

const VERSION = 'v2';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only intercept HTML navigations to the root SPA. Static standalone pages
  // (/watch, /thank-you, legal) must NOT be re-fetched: CF Assets canonicalizes
  // them (/x.html → /x, trailing-slash) and a manual-redirect re-fetch turns
  // that into an extra browser navigation — a visible "double refresh".
  if (req.mode !== 'navigate') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname !== '/') return;

  const headers = new Headers(req.headers);
  headers.set('x-sw-verified', '1');
  headers.set('x-sw-version', VERSION);

  const augmented = new Request(req, { headers, redirect: 'manual' });
  event.respondWith(fetch(augmented));
});
