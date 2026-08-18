// Forex Passing — /thank-you, the page an accepted applicant lands on.
//
// Reached exactly one way: the questionnaire is scored server-side
// (api/_lib/lead-quality.js), api/event/subscribe.js answers `hq: true`, and
// ApplyFlow sends the person here. Nothing links to it, emit-routes.mjs marks it
// noindex, and both the Worker (workers/edge.ts) and the origin backstop
// (middleware.ts) hand the safe page to bots and ad reviewers instead.
//
// Its whole job is the handover to Telegram: prove which accounts are ours,
// prove which handles are ours, and make the next click obvious to someone who
// has never used the app. Every number on the page comes from constants.ts or
// from the prop firm's public record (data/payouts.ts). The places we cannot
// fill yet — the video, the two photos, the team figures — render as reserved
// slots rather than as claims; see constants.ts for how to publish each one.
//
// It fires NO conversion event. `Lead` already went out from the form, and a
// second one here would count the same applicant twice.

import { useEffect, useRef, useState } from 'react'
import {
  BRAND_GREEN,
  CONTACT_EMAIL,
  FREE_CHALLENGE_SIZE,
  FREE_TELEGRAM_HANDLE,
  FREE_TELEGRAM_HREF,
  PARTNER_FIRM,
  SITE_DOMAIN,
  TEAM_PHOTO_SRC,
  TEAM_SIZE,
  TEAM_YEARS,
  TELEGRAM_ADMIN_HANDLE,
  TELEGRAM_CHANNEL_HANDLE,
  TELEGRAM_CHANNEL_HREF,
  TELEGRAM_HREF,
  telegramWith,
  WISTIA_TYP_POSTER,
  TYP_ALERTS,
  TYP_SPOTS_BANNER,
  TYP_TELEGRAM_SHOT_SRC,
  WISTIA_TYP_ID,
} from '../constants'
import { FAQ } from '../data/faq'
import { TESTIMONIALS } from '../data/testimonials'
import { fillSpots, nextEtMidnight, nextSpotsChange, spotsAt, SPOTS_TOKEN } from '../lib/spots'
import {
  AutoScroller,
  REVIEWS,
  ReviewBadge,
  ReviewCard,
  SiteFooter,
  SoundGate,
  TestimonialCard,
  TopBar,
  track,
  useReveal,
} from './shared'

/* --------------------------------------------------------------------------
 * Pieces
 * ------------------------------------------------------------------------ */

/* Odliczanie przy pasku „BOGO offer ends in" oraz liczba wolnych miejsc.
 *
 * Sam rachunek — doba nowojorska i wartość licznika miejsc — siedzi w
 * lib/spots.ts, bo czyta go jeszcze jedno miejsce poza przeglądarką:
 * bin/sync-telegram-spots.mjs, które tą samą liczbą opisuje kanał na
 * Telegramie. Tutaj zostaje tylko oprawa reactowa.
 *
 * Licznik nie potrzebuje ŻADNEJ PAMIĘCI: jest policzony z zegara, więc
 * odświeżenie strony nie cofa go na start, każdy widzi tę samą wartość, a po
 * północy sam przetacza się na kolejną dobę. Pierwsza wersja losowała termin na
 * sesję i trzymała go w sessionStorage — to była wymyślona presja i wymagało
 * zapisu w przeglądarce; koniec dnia w Nowym Jorku jest granicą, która
 * naprawdę istnieje.
 *
 * UWAGA: Countdown na /meta liczy do LOKALNEJ północy odwiedzającego, nie do
 * nowojorskiej. Te dwa liczniki nie są ze sobą zsynchronizowane.
 */

function useSpotsLeft() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    let id = 0
    // Budzik ustawiany DOKŁADNIE na próg zmiany, nie co kilkanaście sekund.
    // Dzięki temu pas i alert przeskakują w tej samej chwili i nigdy — nawet
    // przez sekundę — nie pokazują dwóch różnych liczb. Przy okazji to sześć
    // wybudzeń na dobę zamiast tysięcy.
    const schedule = () => {
      const t = Date.now()
      id = window.setTimeout(() => {
        setNow(Date.now())
        schedule()
      }, Math.max(1000, nextSpotsChange(t) - t))
    }
    schedule()
    return () => window.clearTimeout(id)
  }, [])
  return spotsAt(now)
}

function SpotsText({ template }: { template: string }) {
  const n = useSpotsLeft()
  return <>{fillSpots(template, n)}</>
}

function OfferCountdown() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Po północy nextEtMidnight zwraca już kolejną dobę, więc licznik sam rusza od
  // nowa — nie ma tu żadnego resetu do dopisania.
  //
  // Sufit 23:59:59: w dniu cofnięcia zegarów doba w Nowym Jorku ma 25 godzin i
  // bez tego licznik pokazywałby przez godzinę „24:59:50", co pod napisem
  // „ends today" czyta się jak błąd.
  let s = Math.min(86_399, Math.max(0, Math.floor((nextEtMidnight(now) - now) / 1000)))
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  s %= 3600
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  // role="timer" ma domyślnie aria-live:off, więc czytnik ekranu nie przeczyta
  // tego na głos co sekundę.
  return (
    <span className="mm-typ-alert-timer mm-count" role="timer">
      {h}:{m}:{sec}
    </span>
  )
}

/**
 * A picture we do not have yet. Renders the exact rectangle the artwork will
 * occupy, so dropping the file in later moves nothing on the page — the same
 * reason ReviewBadge reserves its height and the country flag in the
 * application carries an explicit 20×15 box.
 */
function ImageSlot({
  src,
  alt,
  ratio,
  label,
}: {
  src: string
  alt: string
  ratio: string
  label: string
}) {
  if (!src) {
    return (
      <div className="mm-typ-slot" style={{ aspectRatio: ratio }}>
        <span className="mm-typ-slot-label">{label}</span>
      </div>
    )
  }
  return (
    <img
      className="mm-typ-shot"
      src={src}
      alt={alt}
      style={{ aspectRatio: ratio }}
      loading="lazy"
      decoding="async"
    />
  )
}

/**
 * The one video on this page. Same facade as the hero on /meta: nothing is
 * requested from Wistia until someone presses play, and if the player never
 * upgrades — ad blockers do this constantly on mobile — we say so instead of
 * leaving a dead rectangle.
 *
 * Empty WISTIA_TYP_ID reserves the frame rather than hiding the section, so the
 * page keeps its shape while the clip is being cut.
 */
function TypVideo() {
  const [failed, setFailed] = useState(false)
  const [pct, setPct] = useState(0)
  const playerRef = useRef<HTMLElement | null>(null)
  const seen = useRef(false)

  useEffect(() => {
    if (!WISTIA_TYP_ID) return

    // Ladowane od razu, nie po klikniecu: klip ma ruszac sam, a nie ruszy, jesli
    // jego player wstaje dopiero, gdy ktos w cos stuknie. Kosztuje to ~350 KB
    // od Wistii dla kazdego wchodzacego — swiadoma cena autostartu.
    for (const [src, module] of [
      ['https://fast.wistia.com/player.js', false],
      [`https://fast.wistia.com/embed/${WISTIA_TYP_ID}.js`, true],
    ] as const) {
      if (document.querySelector(`script[src="${src}"]`)) continue
      const s = document.createElement('script')
      s.src = src
      s.async = true
      if (module) s.type = 'module'
      document.head.appendChild(s)
    }

    const timer = window.setTimeout(() => {
      if (!customElements.get('wistia-player')) setFailed(true)
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [])

  // Postep leci z samego elementu, tak jak na /meta: kolejka _wq i zdarzenie
  // `secondchange` naleza do starych osadzen E-v1, w ktorych <wistia-player>
  // sie nie rejestruje. Ten player emituje `timechange` i niesie percentWatched.
  useEffect(() => {
    const el = playerRef.current
    if (!el) return
    const onTime = () => {
      const p = (el as unknown as { percentWatched?: number }).percentWatched
      if (typeof p === 'number') setPct(Math.min(100, Math.round(p * 100)))
    }
    // Zdarzenie zamiast kliku w fasade: klip rusza sam, wiec nie ma juz czego
    // klikac. `seen` pilnuje, zeby pauza i wznowienie nie liczyly sie drugi raz.
    const onPlay = () => {
      if (seen.current) return
      seen.current = true
      track('VideoPlay', 'video_start', { source: 'thank_you' }, true)
    }
    el.addEventListener('timechange', onTime)
    el.addEventListener('play', onPlay)
    return () => {
      el.removeEventListener('timechange', onTime)
      el.removeEventListener('play', onPlay)
    }
  }, [failed])

  if (!WISTIA_TYP_ID) {
    return (
      <div className="mm-typ-video-frame is-empty">
        <span className="mm-typ-slot-label">Video going up here</span>
      </div>
    )
  }

  return (
    <>
    {/* Plakat jako tlo ramki, zeby przez sekunde bootowania playera nie stala tu
        czarna dziura. Przy podmianie miniaturki bumpuj numer w nazwie pliku —
        public/ leci z max-age=86400, patrz komentarz przy WISTIA_TYP_POSTER. */}
    <div className="mm-typ-video-frame" style={{ backgroundImage: `url(${WISTIA_TYP_POSTER})` }}>
      {failed ? (
        <div className="mm-vsl-failed">
          <p>The video could not load — an ad blocker or tracking protection is usually the cause.</p>
          <p>You can turn it off for this page, or just message us on Telegram and ask.</p>
        </div>
      ) : (
        /* Startuje SAM i WYCISZONY — z dzwiekiem zablokowalaby to kazda
           przegladarka. silent-autoplay wystawia przycisk "Sound On", ktorym
           widz sam wlacza dzwiek; to jego klikniecie jest gestem, ktorego
           polityka odtwarzania wymaga. */
        <wistia-player
          ref={playerRef}
          media-id={WISTIA_TYP_ID}
          aspect="1.7777777777777777"
          player-color={BRAND_GREEN}
          playback-rate-control="false"
          settings-control="false"
          resumable="false"
          controls-visible-on-load="true"
          autoplay="true"
          muted="true"
          silent-autoplay="true"
        />
      )}
      {!failed && <SoundGate player={playerRef} />}
    </div>
    {/* Te same klasy co pasek na /meta — .mm-typ-video ma to samo ciemne tlo
        co .mm-vsl, wiec wyglada identycznie i zostaje jedno miejsce do zmiany. */}
    <div className="mm-vsl-bar">
      <span className="mm-vsl-bar-label">Complete video</span>
      <span className="mm-vsl-bar-track">
        <span className="mm-vsl-bar-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="mm-vsl-bar-pct">{pct}%</span>
    </div>
    </>
  )
}

/**
 * ApplyFlow tags the free-account handoff with `?src=free`, and that decides
 * which Telegram account this whole page points at. Read from the URL on every
 * call rather than threaded through props: the query string cannot change while
 * the page is mounted, and six call sites would otherwise have to pass a flag
 * that none of them care about.
 */
function isFromFree() {
  return (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('src') === 'free'
  )
}

/**
 * The repeated call to action. `channel` is the one people join, `admin` the one
 * they write to — and only the latter can carry a prefilled opener, because
 * `?text=` fills a composer and a channel has none.
 *
 * Every admin CTA here passes its own `message`, the same way the questionnaire
 * and the acceptance email do: the person does not have to work out what to
 * write, and the desk can tell from the wording which part of the page they
 * pressed.
 */
function TelegramCta({
  label,
  to,
  source,
  note,
  message,
  white = false,
}: {
  label: string
  to: 'channel' | 'admin'
  source: string
  note?: string
  message?: string
  white?: boolean
}) {
  // On the free-account handoff both destinations collapse into the free
  // account: the free challenge is run from there, and sending someone to the
  // paid channel would hand them the offer they did not apply for.
  const free = isFromFree()
  const href = free
    ? message
      ? telegramWith(message, FREE_TELEGRAM_HREF)
      : FREE_TELEGRAM_HREF
    : to === 'channel'
      ? TELEGRAM_CHANNEL_HREF
      : message
        ? telegramWith(message)
        : TELEGRAM_HREF

  // @FX_Passing_free is a person, not a channel — there is nothing to join. A
  // button still reading "JOIN" would open a one-to-one chat and look like the
  // wrong link was pasted.
  const text = free && to === 'channel' ? 'MESSAGE US ON TELEGRAM' : label

  // Wlasny kontener, nie .mm-cta-center: tamten jest flex-row, wiec podpis
  // ladowal OBOK przycisku zamiast pod nim.
  return (
    <div className="mm-typ-cta">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`mm-btn mm-btn-lg${white ? ' mm-btn-white' : ''}`}
        onClick={() => track('CTAClick', 'cta_click', { source }, true)}
      >
        {text}
      </a>
      {note && <p className="mm-typ-cta-note">{note}</p>}
    </div>
  )
}

/**
 * Ikony wierszy w kolumnach. Kontur, 24×24, `currentColor` — ta sama konwencja
 * co wszystkie inline'owe SVG w repo (SafePage.tsx, MoneyPage.tsx), bo projekt
 * nie ma i nie chce biblioteki ikon.
 */
const PATHS: Record<string, string> = {
  people: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  award: 'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.2 13.9 7 23l5-3 5 3-1.2-9.1',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  check: 'M9 12l2 2 4-4M12 3l1.9 1.4 2.3-.3 1 2.1 2.1 1-.3 2.3L20.4 12l-1.4 1.9.3 2.3-2.1 1-1 2.1-2.3-.3L12 20.4l-1.9-1.4-2.3.3-1-2.1-2.1-1 .3-2.3L3.6 12l1.4-1.9-.3-2.3 2.1-1 1-2.1 2.3.3L12 3z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
}

function Ico({ k, className }: { k: keyof typeof PATHS | string; className: string }) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d={PATHS[k]} />
      </svg>
    </span>
  )
}

function TickIcon() {
  return (
    <span className="mm-typ-tick-ico" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    </span>
  )
}

// Why Telegram is not the risk people think it is. Every line is something the
// agreement or the firm's public record backs up — that is the actual answer to
// the question, and it is checkable in a way "1 billion users" is not.
const REASSURANCE: { t: string; d: string; href?: string; hrefLabel?: string }[] = [
  {
    t: 'The account stays in your name',
    d: 'You buy the evaluation yourself, at your firm. We get trading access under the agreement, never ownership, and you can revoke it by changing the password.',
  },
  {
    t: 'Nothing is paid to us upfront',
    d: 'Our share is invoiced after a payout has already landed with you. There is no subscription and no fee for trying.',
  },
  {
    t: 'Everything is in writing first',
    d: 'Risk limits, the split, the guarantee and how you exit are in the management agreement. Read it before you sign, not after.',
    href: '/contract',
    hrefLabel: 'Read the agreement',
  },
  {
    t: 'You can check the payouts yourself',
    d: `The certificates come from ${PARTNER_FIRM}'s own public record, not from a screenshot we made.`,
    href: '/payouts',
    hrefLabel: 'See the certificates',
  },
]

// Kolumna dowodu. Odwzorowuje uklad ze strony wzorcowej, ale kazdy wiersz jest
// czyms, co da sie u nas sprawdzic: liczby ida z publicznego rejestru prop
// firmy, reszta z umowy. W miejscu, gdzie wzorzec ma "Daily Livestreams",
// stoi umowa na pismie — bo streamow nie prowadzimy, a to jest ta rzecz,
// ktorej konkurencja akurat nie daje.
const PROOF: { k: string; t: React.ReactNode }[] = [
  { k: 'star', t: <>Rated 4.9 out of 5</> },
  // Bez liczby w etykiecie — konkretne kwoty stoja w podpisie pod lista, gdzie
  // sasiaduja ze zrodlem, z ktorego pochodza.
  { k: 'check', t: <>Verified Payouts</> },
  { k: 'shield', t: <>Official Support</> },
  // W miejscu, gdzie wzorzec ma "Daily Livestreams". Streamow nie prowadzimy,
  // a to jest ta rzecz, ktorej konkurencja akurat nie daje na pismie.
  { k: 'doc', t: <>Written Agreement on Every Account</> },
  { k: 'eye', t: <>Real-Time Account Updates</> },
]

/* --------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------ */

export function ThankYouPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  useReveal(rootRef)

  // The opener names the free account, so the desk can tell a free-account
  // applicant apart from an offer-page one without opening the CRM.
  const fromFree = isFromFree()
  const acceptedMessage = fromFree
    ? `My FREE ${FREE_CHALLENGE_SIZE} account application was accepted. I have read the page — what do you need from me to get started?`
    : 'My application was accepted. I have read the page — what do you need from me to get started?'
  const objectionMessage = fromFree
    ? `My FREE ${FREE_CHALLENGE_SIZE} account application was accepted and I have a couple of questions before we start.`
    : 'My application was accepted and I have a couple of questions before we start.'

  // Only clips that exist. The "being filmed" slots earn their place on
  // /reviews, where they say more is coming; directly under "you are qualified"
  // they read as a page that ran out of proof.
  const clips = TESTIMONIALS.filter((t) => t.videoId)

  // Doubled so each marquee wraps seamlessly, second row running the other way.
  const reviewRows = [
    [...REVIEWS, ...REVIEWS],
    [...[...REVIEWS].reverse(), ...[...REVIEWS].reverse()],
  ]

  // Built by pushing rather than by filtering a sparse literal: an unset figure
  // has no tile at all, and no cast is needed to say so.
  const teamStats: { n: string; l: string }[] = []
  if (TEAM_SIZE) teamStats.push({ n: TEAM_SIZE, l: 'Person team' })
  if (TEAM_YEARS) teamStats.push({ n: TEAM_YEARS, l: 'Years combined' })

  return (
    <div className="mm-root mm-root-sub mm-typ" ref={rootRef}>
      {/* href="/meta" jak na pozostałych podstronach. Domyślne "#top" nie robiło
          tu nic widocznego: logo stoi na samej górze strony, więc skok na górę
          dokumentu jest skokiem w miejsce. */}
      <TopBar href="/meta" />

      {/* ⚠ Wymyślona presja — patrz komentarz nad TYP_SPOTS_BANNER. Nie stoi za
          tym żaden licznik; pusta stała zdejmuje pasek. */}
      {TYP_SPOTS_BANNER && (
        <div className="mm-typ-band"><SpotsText template={TYP_SPOTS_BANNER} /></div>
      )}

      {/* ── QUALIFIED ─────────────────────────────────────────────────── */}
      <header className="mm-typ-hero">
        <div className="mm-wrap">
          <TickIcon />
          <h1 className="mm-h1 mm-center mm-typ-h1">
            YOU ARE <span className="mm-teal">QUALIFIED</span>
          </h1>
          <p className="mm-lead mm-center mm-lead-mid">
            Your application cleared our checks. The next step is one message on Telegram: we confirm
            your firm allows a third party to trade the account, agree the size, and put the
            agreement in writing. Nothing is charged before any of that.
          </p>
        </div>
      </header>

      {/* ── NEXT STEP: VIDEO ──────────────────────────────────────────── */}
      <section className="mm-section mm-reveal">
        <div className="mm-wrap">
          <div className="mm-typ-video">
            <div className="mm-typ-video-head">
              <span className="mm-typ-video-eyebrow">YOUR NEXT STEP</span>
              <span className="mm-typ-video-title">Watch this 60 second video before you join</span>
            </div>
            <TypVideo />
          </div>

          {/* ⚠ To samo co pasek na górze: żadna z tych linii nie jest liczona
              ani datowana. Pusta tablica usuwa całą kartę. */}
          {TYP_ALERTS.length > 0 && (
            <div className="mm-typ-alerts">
              {TYP_ALERTS.map((a, i) => (
                <div className="mm-typ-alert" key={a.t}>
                  <span className="mm-typ-alert-ico" aria-hidden="true">
                    {i === 0 ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 8v13M3 12v9h18v-9M2 8h20v4H2zM12 8a4 4 0 0 0-4-4 2 2 0 0 0 0 4h4zM12 8a4 4 0 0 1 4-4 2 2 0 0 1 0 4h-4z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    )}
                    {/* Kropka siedzi NA ikonce, nie obok wiersza — dopiero w
                        rogu awatara czyta sie jak status "online". */}
                    {i === 1 && <span className="mm-typ-alert-dot" />}
                  </span>
                  <span className="mm-typ-alert-txt">
                    {/* Licznik domyka zdanie („…ends in 07:14:22"), więc siedzi
                        WEWNĄTRZ napisu, a nie przy prawej krawędzi paska. */}
                    <span className="mm-typ-alert-t">
                      {a.t.includes(SPOTS_TOKEN) ? <SpotsText template={a.t} /> : a.t}
                      {/* Spacja jest jawna, bo JSX jej tu nie wstawi. Odstęp z
                          CSS-a widać, ale w samej treści napis skleiłby się w
                          „ends in06:02:34" — i tak przeczytałby go czytnik. */}
                      {a.timer && <>{' '}<OfferCountdown /></>}
                    </span>
                    {a.d && <span className="mm-typ-alert-d">{a.d}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── JOIN ──────────────────────────────────────────────────────── */}
      {/* Bez naglowka i bez leadu — zostaje sam zrzut z Telegrama i przycisk pod
          nim, dokladnie jak we wzorcu. Proporcja jest proporcja pliku, wiec
          object-fit:cover niczego nie obcina. */}
      <section className="mm-section mm-typ-howto mm-reveal">
        <div className="mm-wrap">
          <div className="mm-typ-shot-wrap">
            <ImageSlot
              src={TYP_TELEGRAM_SHOT_SRC}
              alt="Where to tap in Telegram: message the admin, then press Join"
              ratio="1200 / 888"
              label="Telegram screenshot going here"
            />
          </div>
          <TelegramCta
            label="JOIN TELEGRAM NOW"
            to="channel"
            source="typ_join_top"
            note="Tap above to message the team and lock in your spot."
          />
        </div>
      </section>

      {/* ── OFFICIAL CHANNELS ─────────────────────────────────────────── */}
      <section className="mm-section mm-typ-official mm-reveal">
        <div className="mm-wrap">
          <span className="mm-eyebrow mm-eyebrow-teal mm-eyebrow-c">VERIFIED &amp; OFFICIAL</span>
          <h2 className="mm-h2 mm-center">BEFORE YOU MESSAGE US</h2>
          <p className="mm-lead mm-center mm-lead-mid">
            Twenty seconds to confirm you are talking to the real Forex Passing, and to see exactly
            who you will be working with.
          </p>

          <div className="mm-typ-card">
            <div className="mm-typ-card-head">
              <h3 className="mm-h3">OFFICIAL FOREX PASSING COMMUNICATION</h3>
              <p>People impersonate services like ours. These are our only channels.</p>
            </div>

            <div className="mm-typ-channels">
              <div className="mm-typ-channel">
                <span className="mm-typ-channel-k">Official website</span>
                <span className="mm-typ-channel-v">{SITE_DOMAIN}</span>
              </div>
              <div className="mm-typ-channel">
                <span className="mm-typ-channel-k">Official email</span>
                <span className="mm-typ-channel-v">{CONTACT_EMAIL}</span>
              </div>
              {/* The handle this applicant will actually be written to. Listing
                  the paid pair to a free-account applicant would teach them to
                  trust the wrong account and distrust the right one. */}
              <div className="mm-typ-channel">
                <span className="mm-typ-channel-k">Official Telegram</span>
                <span className="mm-typ-channel-v">
                  {fromFree ? FREE_TELEGRAM_HANDLE : TELEGRAM_CHANNEL_HANDLE}
                </span>
                {!fromFree && <span className="mm-typ-channel-sub">and {TELEGRAM_ADMIN_HANDLE}</span>}
              </div>
            </div>

            {/* The two sentences that actually stop the common fraud: nobody
                legitimate needs the trading password, and our share is invoiced,
                never collected to a personal wallet. */}
            <p className="mm-typ-warn">
              These are our <strong>only</strong> accounts. If anyone contacts you from a different
              one claiming to be Forex Passing, it is <strong>not us</strong>. We will never ask you
              for your platform password, and we will never ask you to send money to a personal
              wallet or card.
            </p>
          </div>
        </div>
      </section>

      {/* ── TEAM + WHAT YOU'RE JOINING ────────────────────────────────── */}
      <section className="mm-section mm-typ-two mm-reveal">
        <div className="mm-wrap">
          <div className="mm-typ-cols">
            <div className="mm-typ-col">
              <div className="mm-typ-col-head">
                <Ico k="people" className="mm-typ-col-ico" />
                <h3 className="mm-typ-col-h">MEET YOUR TEAM</h3>
              </div>
              {/* 1200/679 to proporcja pliku. Przy 4/3 object-fit:cover zjadlby
                  boki, a na tej grafice na bokach stoja ludzie. */}
              <ImageSlot
                src={TEAM_PHOTO_SRC}
                alt="The Forex Passing team: Alex from support, Adam the manager and Mark, the trader on the desk"
                ratio="1200 / 679"
                label="Team photo going here"
              />
              {/* Rendered only for figures that were actually supplied. An empty
                  constant drops the tile — a number nobody gave us is not a
                  number we are going to invent. */}
              {teamStats.length > 0 && (
                <div className="mm-typ-stats">
                  {teamStats.map((s) => (
                    <div className="mm-typ-stat" key={s.l}>
                      <span className="mm-typ-stat-n">{s.n}</span>
                      <span className="mm-typ-stat-l">{s.l}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mm-typ-col-d">
                The desk that trades the account and the people who answer when you write. Ask any of
                us anything before you sign — that is what the first conversation is for.
              </p>
            </div>

            <div className="mm-typ-col">
              <div className="mm-typ-col-head">
                <Ico k="award" className="mm-typ-col-ico" />
                <h3 className="mm-typ-col-h">WHAT YOU'RE JOINING</h3>
              </div>
              <ReviewBadge />
              <div className="mm-typ-proof">
                {PROOF.map((r) => (
                  <div className="mm-typ-proof-row" key={r.k}>
                    <Ico k={r.k} className="mm-typ-proof-ico" />
                    <span>{r.t}</span>
                  </div>
                ))}
              </div>
              {/* Bez kwoty i bez liczby kont. Twarde dane stoja na /payouts,
                  obok certyfikatow, z ktorych sa policzone — tutaj, dwa ekrany
                  po "jesteś zakwalifikowany", licza sie nie cyfry, tylko to, ze
                  wyplaty juz sie wydarzyly i mozna je sprawdzic samemu. */}
              <p className="mm-typ-col-d">
                Payouts here are not a promise — they are already on the record, certificate after
                certificate, in other traders' names. Yours is the next one we go after.{' '}
                <a href="/payouts">Check them yourself</a>.
              </p>
            </div>
          </div>

          <TelegramCta
            label="MESSAGE US ON TELEGRAM"
            to="admin"
            source="typ_message_team"
            note="Double-check the handle above before you send your first message."
            message={acceptedMessage}
          />
        </div>
      </section>

      {/* ── THE OBJECTION ─────────────────────────────────────────────── */}
      <section className="mm-section mm-typ-note mm-reveal">
        <div className="mm-wrap">
          <span className="mm-eyebrow mm-eyebrow-teal mm-eyebrow-c">QUICK NOTE BEFORE YOU JOIN</span>
          <h2 className="mm-h2 mm-center">"ISN'T TELEGRAM WHERE SCAMMERS HANG OUT?"</h2>
          <p className="mm-lead mm-center mm-lead-mid">
            Fair question, and worth asking. We use it because it keeps the whole relationship fast,
            visible and in one place instead of behind a dashboard you never hear from. But the app
            is not what protects you here — the paperwork is.
          </p>
          <div className="mm-typ-grid4">
            {REASSURANCE.map((r) => (
              <div className="mm-typ-tile" key={r.t}>
                <TickIcon />
                <span className="mm-typ-tile-t">{r.t}</span>
                <span className="mm-typ-tile-d">{r.d}</span>
                {r.href && (
                  <a className="mm-typ-tile-a" href={r.href}>
                    {r.hrefLabel} →
                  </a>
                )}
              </div>
            ))}
          </div>
          <TelegramCta
            label="MESSAGE US ON TELEGRAM"
            to="admin"
            source="typ_message_objection"
            message={objectionMessage}
          />
        </div>
      </section>

      {/* ── CLIPS — see the warning at the top of data/testimonials.ts ─── */}
      {clips.length > 0 && (
        <section className="mm-section mm-testi mm-reveal">
          <div className="mm-wrap">
            <h2 className="mm-h2 mm-center">VIDEO TESTIMONIALS</h2>
            <p className="mm-lead mm-center mm-lead-mid">
              The short version is written under each video.
            </p>
            <div className="mm-testi-grid">
              {clips.map((t) => (
                <TestimonialCard testimonial={t} key={t.videoId} />
              ))}
            </div>
            <p className="mm-disclaimer" style={{ marginTop: 26 }}>
              Individual results. Past performance is not indicative of future results, an evaluation
              can fail, and no outcome is guaranteed.
            </p>
            <TelegramCta label="JOIN TELEGRAM &amp; GET STARTED" to="channel" source="typ_join_clips" />
          </div>
        </section>
      )}

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="mm-section mm-faq mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">FREQUENTLY ASKED QUESTIONS</h2>
          <p className="mm-lead mm-lead-mid mm-center">
            Guarantees, fees and how we work. Straight answers, including the ones that are a no.
          </p>
          <div className="mm-acc">
            {FAQ.map((f) => (
              <details className="mm-acc-item" key={f.q}>
                <summary>{f.q}</summary>
                <p className="mm-acc-a">{f.a}</p>
              </details>
            ))}
          </div>
          <TelegramCta label="READY? JOIN TELEGRAM" to="channel" source="typ_join_faq" />
        </div>
      </section>

      {/* ── REVIEWS ───────────────────────────────────────────────────── */}
      <section className="mm-reviews mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center mm-reviews-h">OUR VERIFIED REVIEWS</h2>
          <ReviewBadge onDark />
          <p className="mm-reviews-sub">
            Rated <strong>4.9</strong> out of 5 based on <strong>500+</strong> reviews
          </p>
        </div>
        {reviewRows.map((row, ri) => (
          <AutoScroller className="mm-scroller-rev" key={ri} reverse={ri === 1} speed={0.32} lock>
            {row.map((r, i) => (
              <ReviewCard review={r} key={r.name + i} />
            ))}
          </AutoScroller>
        ))}
        <div className="mm-wrap">
          <TelegramCta label="JOIN TELEGRAM NOW" to="channel" source="typ_join_bottom" white />
        </div>
      </section>

      <SiteFooter variant="proof" />
    </div>
  )
}
