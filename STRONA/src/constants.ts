// Forex Passing — stałe globalne (warunki usługi, linki, kolory).
//
// Model: nic nie jest sprzedawane na stronie. Jedyna konwersja to kwestionariusz
// (#apply) — zespół odzywa się po jego przesłaniu. Żadnego Stripe ani checkoutu.
//
// KAŻDA liczba dotycząca warunków ma pochodzić stąd, nie z literału w JSX.
// Zmiana splitu czy okna czasowego w jednym miejscu przechodzi na całą stronę.

export const BRAND = 'Forex Passing'

// Warunki usługi — jedno źródło prawdy.
export const CLIENT_SPLIT = '70%'
export const OUR_SPLIT = '30%'
export const PASS_WINDOW = '7–14 days'
export const GUARANTEE_CREDIT = '$500'
export const REFUND_WINDOW = '120 days'

// Kwestionariusz → worker (routes/event.ts) lub funkcja Vercela (api/event/subscribe.js).
export const APPLY_ENDPOINT = '/api/event/subscribe'
// Kotwica sekcji z formularzem — używana przez wszystkie CTA.
export const APPLY_ANCHOR = '#apply'

export const TELEGRAM_HREF = 'https://t.me/forexpassing'
export const CONTACT_EMAIL = 'contact@forexpassing.com'

// Prop firma, z którą pracujemy. Certyfikaty w pasie na /meta pochodzą z jej
// publicznego API (zob. bin/sync-payouts.mjs i src/data/payouts.ts).
export const PARTNER_FIRM = 'Pro Traders Funding'
export const PARTNER_FIRM_HREF = 'https://protradersfunding.com'

export const WISTIA_ENABLED = true

export const COLORS = {
  bg: '#0A0F0D',
  bgElev: '#0F1613',
  bgCard: '#121A16',
  border: '#1E2A24',
  borderStrong: '#2A3A32',
  text: '#E6EFEA',
  textDim: '#8A9A91',
  textMute: '#5A6A61',
  accent: '#00E676',
  accentSoft: 'rgba(0, 230, 118, 0.12)',
  danger: '#FF1744',
  dangerSoft: 'rgba(255, 23, 68, 0.12)',
} as const

// Maksymalna szerokość kontenera (desktop)
export const MAX_W = 1180
