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
// Kotwica sekcji z kartą podglądu formularza — używana przez CTA spoza /meta.
export const APPLY_ANCHOR = '#apply'

// JEDNA etykieta przycisku na całej stronie ofertowej. Powtarza się pod każdą
// sekcją i w pasku na dole — czytelnik ma widzieć zawsze ten sam krok, nie trzy
// różne nazwy tej samej rzeczy.
export const CTA_LABEL = "LET'S START NOW"
export const FORM_PREVIEW_LABEL = 'Start your application'
export const FORM_PREVIEW_PLACEHOLDER = 'Enter your full name...'

// Hero-wideo na /meta. Puste = sekcja się nie renderuje; wpisz tu ID filmu
// z Wistii, żeby ją włączyć. Celowo NIE jest to klip z /watch — tamten pokazuje
// w kadrze ofertę poprzedniego produktu ($49).
export const WISTIA_META_ID = ''

// Kontakt do zespołu. Statyczne strony w public/ i szablony maili nie mogą
// importować tego pliku, więc mają adres wpisany wprost — przy zmianie uchwytu
// trzeba je podmienić razem z tą stałą (grep po "t.me/").
export const TELEGRAM_HREF = 'https://t.me/forexpassingadmin'
export const CONTACT_EMAIL = 'contact@forexpassing.com'

// Prop firma, z którą pracujemy. Certyfikaty w pasie na /meta pochodzą z jej
// publicznego API (zob. bin/sync-payouts.mjs i src/data/payouts.ts).
export const PARTNER_FIRM = 'Pro Traders Funding'
export const PARTNER_FIRM_HREF = 'https://protradersfunding.com'

// ⚠ WARUNKI PROGRAMU POLECEŃ — REALNE ZOBOWIĄZANIE FINANSOWE.
// Odwzorowane z programu mgmtfx na wyraźne życzenie właściciela. Prowizja jest
// liczona od NASZEGO wynagrodzenia (OUR_SPLIT), nie od całej wypłaty klienta —
// inaczej przy dwóch poleceniach oddawalibyśmy więcej, niż zarabiamy.
// Darmowe konta w progach 2 i 3 to koszt po naszej stronie: potwierdź, zanim
// strona pójdzie w reklamy.
export const REFERRAL_COMMISSION_RANGE = '10–15%'
export const REFERRAL_TIERS = 3

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
