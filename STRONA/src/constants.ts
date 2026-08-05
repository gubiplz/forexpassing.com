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

// ⚠ ZNIŻKA PARTNERSKA NA CHALLENGE — obietnica wobec klienta.
// To NIE jest przelew od nas: klient płaci mniej w kasie prop firmy, bo kupuje
// przez nasz link partnerski. Formułujemy to zawsze jako "you pay X less", nigdy
// jako "we cover X" — pieniądze nie przechodzą przez nas i umowa (§5) tego nie
// pokrywa.
//
// PUSTY STRING = obietnica znika ze strony, ankiety i umowy. Tak ma zostać,
// dopóki zniżka nie jest realnie ustalona z prop firmą. Zob. renderowanie
// warunkowe w MoneyPage, SubPage, TermsCard i questionnaire.
export const EVAL_DISCOUNT = '20%'
export const EVAL_DISCOUNT_NOTE = 'through our partner link, sent once you are accepted'

// Gwarancja w jednym zdaniu — jedno źródło dla strony ofertowej, ankiety i FAQ.
// Każdy jej człon MUSI mieć pokrycie w umowie (src/data/agreement.ts §5):
// kolejne podejście na nasz koszt = remedium c), zwrot + kredyt = a) i b),
// okno = REFUND_WINDOW. Zmiana tego zdania bez zmiany §5 robi z niego kłamstwo.
export const GUARANTEE_LINE =
  `Lose the account with us and the next evaluation is on us, or you take back every fee you paid ` +
  `us plus a ${GUARANTEE_CREDIT} credit. Your choice, for ${REFUND_WINDOW}.`

// Kwestionariusz → worker (routes/event.ts) lub funkcja Vercela (api/event/subscribe.js).
export const APPLY_ENDPOINT = '/api/event/subscribe'
// Kotwica sekcji z kartą podglądu formularza — używana przez CTA spoza /meta.
export const APPLY_ANCHOR = '#apply'

// Dokąd trafia przyjęty aplikant po wysłaniu ankiety. Adres stoi TUTAJ, a nie
// w odpowiedzi API — endpoint mówi wyłącznie „hq: true/false". Gdyby wracał
// stamtąd URL, każdy, kto podmieni odpowiedź, wskazywałby, dokąd wysłać
// człowieka po naszej stronie.
export const THANK_YOU_HREF = '/thank-you'

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
export const BRAND_GREEN = '#15803d'

// Wideo na /thank-you — inne niż hero na /meta, bo mówi do kogoś, kto już
// zaaplikował i został przyjęty ("watch this before you join"). Puste renderuje
// zarezerwowane miejsce o docelowych proporcjach, nie chowa sekcji: strona ma
// wtedy nadal ten sam kształt, a wgranie klipu to podmiana tej jednej wartości.
// Anotacja `: string` jest tu potrzebna, nie ozdobna: bez niej TypeScript
// zawęża stałą do typu literalnego '' i każde `if (!WISTIA_TYP_ID)` staje się
// gałęzią zawsze prawdziwą, a druga — martwym kodem, który przestaje się
// sprawdzać. To samo dotyczy pozostałych pustych stałych niżej.
export const WISTIA_TYP_ID: string = 'efyfqeekwt'
/**
 * Klatka z tego klipu, zapisana u nas (`bin` → 960×540 webp) zamiast swatcha
 * z fast.wistia.com. Wistia podaje własny podgląd pod
 * /embed/medias/<id>/swatch, ale użycie go zaciągałoby ich serwer przy każdym
 * wejściu na stronę, także od kogoś, kto nigdy nie kliknie play — a cały sens
 * fasady jest taki, żeby do tego nie doszło. Ten sam układ co /vsl-poster.webp.
 */
export const WISTIA_TYP_POSTER = '/typ-poster.webp'

// Plakietka oceny nad opiniami na /meta i /reviews. Pusty string renderuje
// zarezerwowane miejsce o docelowym rozmiarze — dokładnie jak EVAL_DISCOUNT
// wygasza claim o zniżce, a videoId: '' w data/testimonials.ts zamienia kartę
// klienta w slot. Żeby ją opublikować: wrzuć plik do public/ i wpisz tu ścieżkę.
// Nic poza tą jedną linijką nie wymaga zmiany.
//
// Plakietka musi opisywać ocenę, którą da się sprawdzić u jej wystawcy. Znak
// niezależnego serwisu opinii (Trustpilot, Google) wolno tu wstawić tylko wtedy,
// gdy pod tym adresem faktycznie stoi nasz profil z tymi opiniami — inaczej
// plakietka twierdzi, że ktoś nas zweryfikował, a nikt tego nie zrobił.
export const REVIEW_BADGE_SRC = '/rating-badge.png'
export const REVIEW_BADGE_ON_DARK_SRC = '/rating-badge-on-dark.png'
export const REVIEW_BADGE_ALT = 'Our rating'

// Kontakt do zespołu. Statyczne strony w public/ i szablony maili nie mogą
// importować tego pliku, więc mają adres wpisany wprost — przy zmianie uchwytu
// trzeba je podmienić razem z tą stałą (grep po "t.me/").
export const TELEGRAM_HREF = 'https://t.me/forexpassingadmin'
export const CONTACT_EMAIL = 'contact@forexpassing.com'

// Dwa różne byty na Telegramie, i strona nie może ich mylić: KANAŁ się
// subskrybuje ("Join"), do ADMINA się pisze ("Message us"). /thank-you pokazuje
// oba obok siebie jako listę oficjalnych kanałów, bo to jedyna obrona przed
// kimś, kto założy @forexpassing_support i napisze pierwszy.
export const TELEGRAM_CHANNEL_HREF = 'https://t.me/forexpassingcom'
export const TELEGRAM_CHANNEL_HANDLE = '@forexpassingcom'
export const TELEGRAM_ADMIN_HANDLE = '@forexpassingadmin'
export const SITE_DOMAIN = 'forexpassing.com'

// Materiały na /thank-you. Pusty string = ramka przerywana o DOCELOWYM
// rozmiarze, ta sama konwencja co REVIEW_BADGE_SRC i videoId: '' w
// data/testimonials.ts — wgranie pliku nie przesuwa układu.
//
// Oba pliki są przycięte do krawędzi karty (strona ma białe tło, więc
// margines dookoła byłby martwym miejscem) i mają PROPORCJE WPISANE NA SZTYWNO
// w ThankYouPage.tsx: 1200/888 i 1200/679. Podmiana pliku o innym kształcie
// wymaga poprawienia tam `ratio` — .mm-typ-shot ma object-fit:cover, więc
// inaczej obcięłoby boki (na zdjęciu zespołu zjadłoby skrajne osoby).
//
// TYP_TELEGRAM_SHOT_SRC: zrzut z Telegrama ze strzałką na "Message us" i na
// przycisk "Join". Bez niego część ludzi nie wie, w co kliknąć po wejściu.
export const TYP_TELEGRAM_SHOT_SRC: string = '/typ-telegram.webp'
export const TEAM_PHOTO_SRC: string = '/typ-team.webp'

// ⚠ LICZBY O ZESPOLE — TWIERDZENIE O NASZEJ FIRMIE, NIE O CUDZEJ.
// Wartości poniżej są przeniesione ze strony wzorcowej (MGMT) na wyraźne
// polecenie właściciela, żeby sekcja miała komplet do oceny na środowisku
// testowym. To NIE są zmierzone liczby Forex Passing. Przed wpuszczeniem
// realnego ruchu trzeba je zastąpić własnymi albo wyczyścić — pusty string
// usuwa kafelek bez śladu i bez zmian w komponencie.
export const TEAM_SIZE: string = '10'
export const TEAM_YEARS: string = '60+'

// ⚠ PRESJA SPRZEDAŻOWA NA /thank-you — WYMYŚLONA, NIE LICZONA Z NICZEGO.
// Dokładnie ten sam status co Countdown na /meta (MoneyPage.tsx): nie stoi za
// tym żaden licznik miejsc ani żadna data. Trzymane decyzją właściciela i
// odwzorowuje stronę wzorcową. Pusty string wygasza dany pasek w całości.
//
// To pierwsza rzecz, którą trzeba zdjąć, jeśli strona ma kiedyś przejść
// weryfikację platformy reklamowej.
export const TYP_SPOTS_BANNER: string = 'ONLY 7 MORE SPOTS AVAILABLE'
export const TYP_ALERTS: { t: string; d?: string }[] = [
  { t: 'Upgrade offer ends today' },
  { t: 'Only 2 Spots Available', d: 'Real-time tracking' },
]

/**
 * Telegram wypełnia okienko wiadomości z ?text=, więc czat otwiera się z już
 * napisanym zagajeniem: piszący nie musi go wymyślać, a zespół po treści widzi,
 * z którego miejsca strony przyszedł. Treść zostaje przy wywołaniu, nie tutaj —
 * zależy od tego, kto klika i w którym momencie.
 *
 * TELEGRAM_HREF zostaje goły: questionnaire.ts wyprowadza z niego @uchwyt
 * przez split('/').pop(), więc doklejony query string by go zepsuł.
 */
export const telegramWith = (message: string) =>
  `${TELEGRAM_HREF}?text=${encodeURIComponent(message)}`

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
