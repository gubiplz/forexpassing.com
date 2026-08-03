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
// The Google Ads lander asks rather than shouts — same flow behind the button.
export const GOOGLE_CTA_LABEL = 'CHECK IF YOU QUALIFY'
export const FORM_PREVIEW_LABEL = 'Start your application'
export const FORM_PREVIEW_PLACEHOLDER = 'Enter your full name...'

// Hero-wideo na /meta. Puste = sekcja się nie renderuje. Ten sam klip stoi teraz
// na /watch: zastąpił nagranie, które pokazywało w kadrze ofertę poprzedniego
// produktu ($49). Podmiana ID tutaj NIE zmienia /watch — tamta strona jest
// statyczna i trzyma je u siebie (grep po media-id).
export const WISTIA_META_ID = 'jiy7nxpusf'
/** The CTA green. The Wistia player is told to paint its controls to match. */
export const BRAND_GREEN = '#16a34a'

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
// Odwzorowane 1:1 z programu mgmtfx na wyraźną decyzję właściciela: prowizja
// liczona jest od WYPŁATY NETTO polecenia, nie od naszego wynagrodzenia. Przy
// naszym OUR_SPLIT oznacza to oddanie ok. połowy prowizji z każdej wypłaty,
// bezterminowo. Darmowe konto dopasowane i bonusy 100K/200K to dodatkowy koszt.
// Zmiana stawki tutaj przechodzi na całą stronę /referral-program.
export const REFERRAL_COMMISSION_RANGE = '10–15%'
export const REFERRAL_TIERS = 3
export const REFERRAL_PAYOUT_RANGE = '$900–$1,350'

export type ReferralTier = {
  code: string
  name: string
  badge: string
  range: string
  per10k: string
  commission: string
  highlight?: boolean
  blurb: string
  perks: string[]
  example: string[]
}

export const REFERRAL_TIERS_DATA: ReferralTier[] = [
  {
    code: 'T-01',
    name: 'Basic',
    badge: 'Open to everyone',
    range: '0–2 referrals',
    per10k: '$900',
    commission: '10% commission rate',
    blurb:
      'Earn from your very first referral. When someone you send in funds a challenge, we buy you a matching account at the same size, free of charge. On top of that you keep 10% of every payout they receive.',
    perks: [
      'Matching funded account at zero cost',
      '10% commission on all referral payouts',
      'No minimum referral requirement',
      'Unlimited earning potential per referral',
    ],
    example: [
      'Friend receives a $10,000 payout',
      'Prop firm takes its 10% share = $9,000 net',
      'You earn 10% of $9,000 = $900',
      'Plus a matching funded account, free',
    ],
  },
  {
    code: 'T-02',
    name: 'Premium',
    badge: 'Most chosen',
    range: '2–5 referrals',
    per10k: '$1,350',
    commission: '15% commission rate',
    highlight: true,
    blurb:
      'Refer 2+ traders and unlock enhanced rewards. You still get matching accounts, plus a free $100K bonus funded account, and your commission climbs to 15% on every payout your referrals generate.',
    perks: [
      'Everything in Basic',
      'Free $100K bonus funded account',
      'Commission increased to 15%',
      'Higher earning ceiling per payout',
    ],
    example: [
      'Friend receives a $10,000 payout',
      'Prop firm takes its 10% share = $9,000 net',
      'You earn 15% of $9,000 = $1,350',
      'Plus a free $100K account on top of matched accounts',
    ],
  },
  {
    code: 'T-03',
    name: 'Platinum',
    badge: 'Elite',
    range: '5+ referrals',
    per10k: '$1,350',
    commission: '15% commission rate',
    blurb:
      'The top tier, reserved for partners who bring in 5+ traders. You receive a free $200K bonus funded account, priority support for funding increases, and priority placement for managed accounts.',
    perks: [
      'Everything in Premium',
      'Free $200K bonus funded account',
      'Priority support for funding increases',
      'Priority placement for managed accounts',
      'VIP status inside Forex Passing',
    ],
    example: [
      'Friend receives a $10,000 payout',
      'Prop firm takes its 10% share = $9,000 net',
      'You earn 15% of $9,000 = $1,350',
      'Plus a free $200K account, matched accounts & priority',
    ],
  },
]

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
