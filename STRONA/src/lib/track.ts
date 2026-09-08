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
 * Makromentor pixel (1566…). FX_09 (2246…) is also initialised in index.html
 * for PageView on the new Meta ad account, but Lead/etc. must stay on 1566 —
 * that is the pixel that actually receives events. Untargeted fbq('track')
 * would hit both, so we address 1566 explicitly.
 */
const OWN_PIXEL = '1566242625059670'

export function track(fbEvent: string, gaEvent: string, params?: Record<string, unknown>, custom = false) {
  if (typeof window === 'undefined') return
  if (custom) window.fbq?.('trackSingleCustom', OWN_PIXEL, fbEvent, params)
  else window.fbq?.('trackSingle', OWN_PIXEL, fbEvent, params)
  window.gtag?.('event', gaEvent, params)
}
