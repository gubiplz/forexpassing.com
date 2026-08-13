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
 * Our own pixel. index.html initialises a second one (1554685979728197) for the
 * media buyer, and that one is to carry PageView and nothing else — he defines
 * his own events in Events Manager. `fbq('track', …)` with no pixel named fires
 * on *every* initialised pixel, so each event below has to be addressed
 * explicitly or it lands in his account too.
 */
const OWN_PIXEL = '1566242625059670'

export function track(fbEvent: string, gaEvent: string, params?: Record<string, unknown>, custom = false) {
  if (typeof window === 'undefined') return
  if (custom) window.fbq?.('trackSingleCustom', OWN_PIXEL, fbEvent, params)
  else window.fbq?.('trackSingle', OWN_PIXEL, fbEvent, params)
  window.gtag?.('event', gaEvent, params)
}
