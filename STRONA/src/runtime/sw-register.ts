// Service Worker registration after human verification.
// Future fetches from this browser will go through SW and carry persistent
// X-Sw-Verified: 1 header — bot/headless can never register SW from a fresh
// session, so this gives Worker an extra strong human signal on next visits.

export async function ensureServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    localStorage.setItem('__sw_v', '1');
  } catch {
    // Some browsers (private mode, certain CSP) block SW — just skip
  }
}
