// Conversion tracking. Fires our Meta Pixel + GA4 (G-LVFV0JTWBE). IDs live in
// index.html.
//
// A module of its own so both shared.tsx and ApplyFlow.tsx can import it —
// ApplyFlow used to carry a copy of this helper precisely to avoid pulling in
// all of shared.tsx, and the two copies were one pixel-ID change away from
// drifting apart.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * FX_09 — the only Meta Pixel on the site. Events still go through trackSingle
 * (named pixel) so adding another pixel later cannot accidentally receive Lead.
 */
const OWN_PIXEL = '2246463729528869'

export function track(fbEvent: string, gaEvent: string, params?: Record<string, unknown>, custom = false) {
  if (typeof window === 'undefined') return
  if (custom) window.fbq?.('trackSingleCustom', OWN_PIXEL, fbEvent, params)
  else window.fbq?.('trackSingle', OWN_PIXEL, fbEvent, params)
  window.gtag?.('event', gaEvent, params)
}
