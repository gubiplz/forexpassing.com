// Forex Passing — chrome and proof widgets shared by every React page.
//
// The money page (/meta) and the footer subpages (/payouts, /past-performance,
// /reviews, /contract) are one design system: same stylesheet, same top bar,
// same footer, same certificate and performance widgets. Everything that more
// than one page renders lives here, so a change lands on all of them at once.

// A real stylesheet, not a string rendered into <style> by React. As a string it
// could not be parsed until the bundle had downloaded and executed, so the first
// paint of the offer page was unstyled. Vite keys it to this chunk, which means
// it is still fetched only by the pages that import this file — SafePage does
// not, and must not start pulling the offer's stylesheet.
import './site.css'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  BRAND_GREEN,
  CLIENT_SPLIT,
  CONTACT_EMAIL,
  EVAL_DISCOUNT,
  OUR_SPLIT,
  PARTNER_FIRM,
  PASS_WINDOW,
  RATING_STARS_45_SRC,
  RATING_STARS_4_SRC,
  RATING_STARS_5_SRC,
  WISTIA_META_ID,
} from '../constants'
import { type PayoutCert } from '../data/payouts'
import { type Testimonial } from '../data/testimonials'
import { VERIFY_QR_SVG } from '../data/verify-qr'

import { track } from '../lib/track'

// Re-exported so AgreementDocument and PartnerPortal keep importing from here.
export { track }

/**
 * Ocena jednej opinii. Trzy stopnie, bo tyle mamy wariantów paska gwiazdek i
 * tyle wystarczy: różni je skrajny prawy kafel.
 *
 * Brak pola = 5. Piątka jest tu regułą, a nie wyjątkiem, więc wpisujemy tylko
 * odstępstwa — dzięki temu widać je na pierwszy rzut oka.
 */
export type StarRating = 5 | 4.5 | 4
export type Review = { name: string; text: string; ago: string; rating?: StarRating }

// Short set for the /meta and referral scrollers — keep this lean so the rail
 // does not feel padded. The full grid on /reviews uses WRITTEN_REVIEWS.
//
// OCENY SĄ DOBRANE POD DEKLARACJĘ ZE STRONY, nie na oko. Nad każdą listą stoi
// „Rated 4.9 out of 5", więc średnia z widocznych kart musi się z tym zgadzać:
// te osiem daje 39,5/8 = 4,94, a pełne dwadzieścia niżej — dokładnie 98/20 =
// 4,90. Dokładając albo zmieniając opinię, przelicz to ponownie, inaczej strona
// zacznie pokazywać co innego, niż o sobie mówi.
export const REVIEWS: Review[] = [
  { name: 'Mike R.', text: 'Three failed evaluations before this. They passed the fourth one in nine days while I was at work. Weird feeling, but the payout was real.', ago: '4 days ago' },
  { name: 'Sarah L.', text: 'What sold me was the rule check. They told me my first firm banned managed accounts and refused to touch it. Nobody else said that.', ago: '1 week ago' },
  { name: 'Carlos D.', text: 'I kept the login the whole time, so I watched every position. No mystery, no “trust us”. Split hit my account two days after the payout.', ago: '1 week ago' },
  { name: 'Dave K.', text: 'First payout cleared last month. I would have blown that account myself by week two. I know because I did it twice already.', ago: '2 weeks ago' },
  { name: 'Priya M.', text: 'The agreement was the part I actually cared about. Risk limits and the exit written down before anyone logged in.', ago: '2 weeks ago' },
  { name: 'James T.', text: 'Was convinced this was a scam. Asked a lot of annoying questions, got straight answers, started small. Still here.', ago: '3 days ago', rating: 4.5 },
  { name: 'Elena V.', text: 'Funded account has been running two months without me touching it. That is the whole review, honestly.', ago: '5 days ago' },
  { name: 'Tom W.', text: 'No monthly fee is what made it easy to try. If they do nothing, they earn nothing.', ago: '6 days ago' },
]

// Extra tiles only on /reviews (WRITTEN REVIEWS grid). Not fed into /meta.
export const WRITTEN_REVIEWS: Review[] = [
  ...REVIEWS,
  { name: 'Nina S.', text: 'Second payout landed this week. Same split as the contract said. Boring in the best way.', ago: '2 days ago' },
  { name: 'Omar H.', text: 'They rejected my first firm on the call. Saved me buying another evaluation that would have been wasted.', ago: '3 days ago' },
  { name: 'Lisa P.', text: 'I only wanted someone to pass the challenge. They did it in under two weeks and I still have the credentials.', ago: '4 days ago' },
  { name: 'Marcus B.', text: 'Chat responses are short and specific. No hype, just “here is what we can and cannot do.”', ago: '5 days ago', rating: 4 },
  { name: 'Ana G.', text: 'Watched the equity curve daily for a month. Drawdown stayed inside the limits they put in writing.', ago: '1 week ago' },
  { name: 'Chris N.', text: 'Started with one account. Added a second after the first payout cleared. That is my proof, not a screenshot.', ago: '1 week ago' },
  { name: 'Yuki T.', text: 'Timezone difference was my worry. They trade while I sleep and send a weekly note. Enough for me.', ago: '1 week ago', rating: 4.5 },
  { name: 'Ben F.', text: 'I paid for the evaluation, they ran it, I got funded. Split arrives after the firm pays out. Clean loop.', ago: '2 weeks ago' },
  { name: 'Sofia R.', text: 'Asked for the agreement before sending money. Got it the same day. Signed, then applied. Order matters.', ago: '2 weeks ago' },
  { name: 'Derek J.', text: 'Blew two prop accounts alone last year. Letting someone else run the rules was the only change that worked.', ago: '3 weeks ago' },
  { name: 'Maya K.', text: 'Support answered the max daily loss question with a number, not a paragraph. That was enough to start.', ago: '3 weeks ago' },
  { name: 'Paul C.', text: 'No pressure to scale. One funded account, steady payouts, I leave it alone. That is the product.', ago: '3 weeks ago' },
]

export function TopBar({ href = '#top' }: { href?: string }) {
  return (
    <div className="mm-topbar">
      <a href={href} className="mm-logo"><img className="mm-logo-img" src="/logo.webp" alt="Forex Passing" /></a>
    </div>
  )
}

// Hero card — the deal in six rows. Every value comes from constants.ts, so the
// card can never drift out of sync with the FAQ or the agreement.
export function TermsCard() {
  return (
    <div className="mm-tcard">
      <div className="mm-tcard-head">
        <span className="mm-tcard-title">TERMS AT A GLANCE</span>
      </div>
      <dl className="mm-tcard-rows">
        <div className="mm-tcard-row">
          <dt>Your share</dt>
          <dd className="mm-tcard-strong">{CLIENT_SPLIT}</dd>
        </div>
        <div className="mm-tcard-row">
          <dt>Our share</dt>
          <dd>{OUR_SPLIT}</dd>
        </div>
        <div className="mm-tcard-row">
          <dt>When we get paid</dt>
          <dd>After a released payout</dd>
        </div>
        <div className="mm-tcard-row">
          <dt>Monthly fee</dt>
          <dd>None</dd>
        </div>
        <div className="mm-tcard-row">
          <dt>Typical evaluation</dt>
          <dd>{PASS_WINDOW}</dd>
        </div>
        {EVAL_DISCOUNT && (
          <div className="mm-tcard-row">
            <dt>Evaluation price</dt>
            <dd className="mm-tcard-strong">{EVAL_DISCOUNT} off</dd>
          </div>
        )}
        <div className="mm-tcard-row">
          <dt>Account owner</dt>
          <dd>You</dd>
        </div>
      </dl>
      <p className="mm-tcard-foot">
        Trading carries risk. An evaluation can fail and no outcome is guaranteed.
      </p>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * FOOTER — the same on every page.
 *
 * Each entry is a real page, not an in-page anchor: a visitor who lands on
 * /reviews from an ad gets the same navigation as one who scrolled the money
 * page. Keep this list in sync with SUB_PATHS in ../runtime/no-edge.ts and the
 * ROUTES array in bin/emit-routes.mjs, or a link here will 404.
 * ------------------------------------------------------------------------- */

// Wide-footer quick links — exactly the five the reference site lists, nothing
// more. Keep in sync with bin/footer.html, SafePage.tsx and public/safe.html.
export const FOOTER_LINKS: [string, string][] = [
  ['Home', '/'],
  ['About Us', '/about-us'],
  ['Forex Passing Meta', '/meta'],
  ['Referral Program', '/referral-program'],
  ['Contract', '/contract'],
]

// The four proof pages, in the order the offer page lists them.
const META_LINKS: [string, string][] = [
  ['Client Payouts', '/payouts'],
  ['Past Performance', '/past-performance'],
  ['Reviews', '/reviews'],
  ['Contract', '/contract'],
]

// The three proof pages link only to each other — Contract is deliberately not
// in this set, matching the reference site.
const PROOF_LINKS: [string, string][] = [
  ['Client Payouts', '/payouts'],
  ['Past Performance', '/past-performance'],
  ['Reviews', '/reviews'],
]

const REFERRAL_LINKS: [string, string][] = [
  ['Referral Program', '/referral-program'],
  ['Partner Portal', '/partner-portal'],
  ['Contract', '/contract'],
  ['Forex Passing Meta', '/meta'],
  ['Reviews', '/reviews'],
]

/**
 * Three variants, one per page family — the reference site does the same.
 *
 * `wide` (default) — three columns then a rule and the copyright. Nothing else:
 *   no risk paragraphs and no legal links, by explicit owner decision. /terms
 *   and /privacy stay reachable by URL but are not linked from anywhere.
 * `meta` — logo and the four proof links. No copyright line.
 * `referral` — logo and the partner-programme links.
 * `proof` — logo and the three proof pages, no Contract.
 * `blank` — logo and the disclaimers only, no links at all. The Google Ads
 *   lander runs on this one: nothing to click but the offer itself.
 */
export function SiteFooter({
  variant = 'wide',
}: {
  variant?: 'wide' | 'meta' | 'referral' | 'proof' | 'blank'
}) {
  const year = new Date().getFullYear()

  if (variant === 'blank') {
    return (
      <footer className="mm-footer mm-footer-blank">
        <div className="mm-wrap mm-footer-center">
          <a href="/google-funnel" className="mm-footer-logo" aria-label="Forex Passing">
            <img className="mm-logo-img mm-logo-img-sm" src="/logo-light.webp" alt="Forex Passing" />
          </a>
          <p className="mm-footer-fine">
            Trading disclaimer: foreign exchange, CFD and proprietary trading firm evaluations
            involve substantial risk of loss and are not suitable for every investor. Past
            performance is not indicative of future results. You may lose some or all of your
            invested capital. Nothing on this page constitutes financial, investment or trading
            advice.
          </p>
          <p className="mm-footer-fine">
            This website is operated by Forex Passing. It is not affiliated with, endorsed by or
            sponsored by Google LLC. Google and the Google logo are trademarks of Google LLC.
          </p>
        </div>
      </footer>
    )
  }

  if (variant === 'meta' || variant === 'referral' || variant === 'proof') {
    const links =
      variant === 'meta' ? META_LINKS : variant === 'referral' ? REFERRAL_LINKS : PROOF_LINKS
    const home = variant === 'referral' ? '/referral-program' : '/meta'
    return (
      <footer className={`mm-footer mm-footer-${variant}`}>
        <div className="mm-wrap mm-footer-center">
          <a href={home} className="mm-footer-logo" aria-label="Forex Passing, home">
            <img className="mm-logo-img mm-logo-img-sm" src="/logo-light.webp" alt="Forex Passing" />
          </a>
          <nav className="mm-footer-nav" aria-label="Footer">
            {links.map(([label, href]) => (
              <a href={href} key={href}>{label}</a>
            ))}
          </nav>
        </div>
      </footer>
    )
  }

  return (
    <footer className="mm-footer">
      <div className="mm-wrap">
        <div className="mm-footer-top">
          <div className="mm-footer-brand">
            <a href="/" className="mm-footer-logo" aria-label="Forex Passing, home">
              <img className="mm-logo-img mm-logo-img-sm" src="/logo-light.webp" alt="Forex Passing" />
            </a>
            <p className="mm-footer-tagline">
              Forex Passing. We pass prop firm evaluations and manage funded accounts for our
              clients, under a written agreement. You keep the account and {CLIENT_SPLIT} of every
              payout.
            </p>
          </div>

          <div className="mm-footer-col">
            <span className="mm-footer-h">Quick links</span>
            {FOOTER_LINKS.map(([label, href]) => (
              <a href={href} key={href}>{label}</a>
            ))}
          </div>

          <div className="mm-footer-col">
            <span className="mm-footer-h">Contact</span>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </div>
        </div>

        <hr className="mm-footer-rule" />

        <p className="mm-footer-copy mm-footer-copy-center">
          © {year} Forex Passing. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

/* Scroll-reveal: fade/slide `.mm-reveal` sections in once as they enter view.
 * Fails open — no IntersectionObserver or reduced-motion means everything is
 * shown immediately rather than staying invisible. */
export function useReveal(rootRef: { current: HTMLElement | null }) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const els = Array.from(root.querySelectorAll<HTMLElement>('.mm-reveal'))
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }
      },
      // threshold 0, not a fraction of the element: a section taller than ~6
      // viewports (the payout grid) can fill the screen and still never reach
      // 15% of its own height, which used to leave it stuck at opacity 0.
      // The negative bottom margin is what delays the reveal instead.
      { threshold: 0, rootMargin: '0px 0px -12% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [rootRef])
}


// Native horizontal scroller: auto-advances, yields to touch/drag, seamless wrap.
export function AutoScroller({
  speed = 0.6,
  reverse = false,
  lock = false,
  className = '',
  ariaLabel,
  children,
}: {
  speed?: number
  reverse?: boolean
  lock?: boolean
  className?: string
  ariaLabel?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const track = el.firstElementChild as HTMLElement | null
    if (!track) return
    // Reduced motion suppresses the idle drift only. Bailing out entirely used to
    // skip the drag handlers below too, and since the strip is overflow:hidden
    // that left these readers looking at the first card with no way to the rest.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    let half = track.scrollWidth / 2
    let acc = 0
    let resumeAt = 0
    const bump = () => { resumeAt = performance.now() + 1800 }
    const wrap = (v: number) => (half > 0 ? ((v % half) + half) % half : 0)
    // GPU-composited transform — no per-frame scrollLeft write or scrollWidth read,
    // both of which force synchronous layout/paint on the main thread (mobile jank).
    const apply = () => { track.style.transform = `translate3d(${-acc}px,0,0)` }

    // Recompute the wrap distance only when late-loading images change the width.
    const ro = new ResizeObserver(() => { half = track.scrollWidth / 2 })
    ro.observe(track)

    let down = false
    let startX = 0
    let startAcc = 0
    // Flick momentum. Without it a swipe travels exactly as far as the finger and
    // stops dead, so browsing the band on a phone takes a dozen swipes.
    let vel = 0
    let lastX = 0
    let lastT = 0
    const onDown = (e: PointerEvent) => {
      bump()
      down = true
      vel = 0
      startX = e.clientX
      startAcc = acc
      lastX = e.clientX
      lastT = performance.now()
      el.setPointerCapture(e.pointerId)
      // Dragging a marquee must not paint a text selection across the cards.
      // preventDefault stops one from starting; the collapse clears a selection
      // the reader already had, which would otherwise stay highlighted and
      // extend as the pointer moves.
      if (e.pointerType === 'mouse') {
        e.preventDefault()
        const sel = window.getSelection()
        if (sel && !sel.isCollapsed) sel.removeAllRanges()
      }
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      const now = performance.now()
      const dt = now - lastT
      if (dt > 0) {
        // Velocity in px per frame, signed like acc (finger left = content left).
        // Smoothed so one jittery sample cannot dominate the flick.
        const v = (-(e.clientX - lastX) / dt) * 16
        vel = vel * 0.7 + Math.max(-45, Math.min(45, v)) * 0.3
        lastX = e.clientX
        lastT = now
      }
      acc = wrap(startAcc - (e.clientX - startX))
      apply()
    }
    // pointercancel fires when the browser claims the gesture for page scroll. It
    // never pairs with pointerup, so without it `down` stays true and the band
    // freezes for good.
    const onUp = () => { down = false; bump() }

    const frame = (now: number) => {
      if (half > 0 && !down) {
        if (Math.abs(vel) > 0.1) {
          acc = wrap(acc + vel)
          vel *= 0.94
          apply()
        } else if (!reduced && now >= resumeAt) {
          vel = 0
          acc = wrap(acc + (reverse ? -speed : speed))
          apply()
        }
      }
      raf = requestAnimationFrame(frame)
    }
    track.style.willChange = 'transform'
    apply()
    raf = requestAnimationFrame(frame)

    // lock = auto-scroll only, no manual drag/swipe.
    if (!lock) {
      el.addEventListener('pointerdown', onDown, { passive: false })
      el.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      el.addEventListener('wheel', bump, { passive: true })
    }
    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
      track.style.willChange = ''
      if (!lock) {
        el.removeEventListener('pointerdown', onDown)
        el.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        el.removeEventListener('wheel', bump)
      }
    }
  }, [reverse, speed, lock])
  return (
    <div className={`mm-scroller ${lock ? 'mm-scroller-lock ' : ''}${className}`} ref={ref} aria-label={ariaLabel} role="list">
      <div className="mm-scroller-track">{children}</div>
    </div>
  )
}

/**
 * Pasek gwiazdek. Jeden obrazek, nie pięć kafli rysowanych CSS-em, bo to ta
 * sama grafika, którą Trustpilot rozdaje jako plik — kafle z własnego CSS-a
 * miały inny kształt gwiazdki i inny promień rogu niż napis nad nimi.
 *
 * Przerwy między kaflami są w pliku przezroczyste, więc na białej karcie i na
 * ciemnym tle działa ten sam plik. Wyjątek opisuje komentarz przy
 * RATING_STARS_5_SRC w constants.ts.
 *
 * `alt=""` tam, gdzie tuż obok stoi ta sama ocena słowami — inaczej czytnik
 * ekranu przeczyta ją dwa razy, i to dwiema różnymi liczbami (pasek jest
 * zaokrąglony do pół gwiazdki, tekst nie).
 */
export function RatingStars({
  rating,
  className,
  alt,
}: {
  rating: StarRating
  className?: string
  alt?: string
}) {
  const src =
    rating === 5 ? RATING_STARS_5_SRC : rating === 4.5 ? RATING_STARS_45_SRC : RATING_STARS_4_SRC
  return (
    <img
      className={className ? `mm-stars ${className}` : 'mm-stars'}
      src={src}
      // Wymiary własne pliku — przeglądarka rezerwuje proporcję, zanim obrazek
      // dojdzie, więc karta opinii nie skacze. Wysokość nadaje CSS.
      width={800}
      height={150}
      alt={alt ?? `Rated ${rating} out of 5`}
      loading="lazy"
      decoding="async"
    />
  )
}

// One Trustpilot-style review card. Shared by the money page marquee and the
// /reviews grid so both stay identical.
export function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="mm-rev-card" role="listitem">
      <RatingStars rating={review.rating ?? 5} className="mm-rev-stars" />
      <div className="mm-rev-name">{review.name}</div>
      <p className="mm-rev-text">{review.text}</p>
      <div className="mm-rev-meta">
        <span>{review.ago}</span>
        <span className="mm-rev-verified">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z" /></svg>
          Verified
        </span>
      </div>
    </div>
  )
}

/**
 * The rating badge above the reviews, on both /meta and /reviews.
 *
 * Pasek gwiazdek pokazuje PIĘĆ PEŁNYCH, a nie 4,5 z grafiki źródłowej: pod
 * spodem leci „Rated 4.9 out of 5", a 4,9 zaokrągla się do pięciu. Ocena jest tu
 * na sztywno, bo to jedna, deklarowana ocena firmy — stopniowanie dotyczy
 * pojedynczych opinii, nie plakietki.
 */
export function ReviewBadge({ onDark = false }: { onDark?: boolean } = {}) {
  return (
    <div className={onDark ? 'mm-rev-badge is-on-dark' : 'mm-rev-badge'}>
      <span className="mm-rev-badge-stars">
        <RatingStars rating={5} alt="" />
      </span>
    </div>
  )
}

/**
 * "Tap for sound" nad autostartującym klipem — na /meta i na /thank-you, więc
 * stoi tutaj.
 *
 * Klip rusza sam i wyciszony, bo autoplay z dźwiękiem blokuje każda
 * przeglądarka. Wistia ma pod `silent-autoplay` własny przycisk „Click for
 * sound", ale RENDERUJE GO Z ROZMIAREM 0×0 — zmierzone w Chrome — więc widzowi
 * zostaje ikonka głośnika 40×34 w pasku sterowania, której nikt nie szuka.
 * Ta nakładka robi ten sam gest, tylko widocznie.
 *
 * Zakrywa cały kadr celowo: pierwsze kliknięcie gdziekolwiek w film ma włączać
 * dźwięk, a nie pauzować. Znika po odciszeniu i nie wraca — również wtedy, gdy
 * ktoś odciszy sam, ikonką w pasku, bo stan czytamy z playera, nie z siebie.
 */
export function SoundGate({ player }: { player: { current: HTMLElement | null } }) {
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const el = player.current
    if (!el) return
    const sync = () => setMuted(!!(el as unknown as { muted?: boolean }).muted)
    sync()
    // `timechange` leci przez cały czas odtwarzania, więc łapie też odciszenie
    // ikonką w pasku, na wypadek gdyby `mutechange` nie było emitowane.
    el.addEventListener('timechange', sync)
    el.addEventListener('mutechange', sync)
    return () => {
      el.removeEventListener('timechange', sync)
      el.removeEventListener('mutechange', sync)
    }
  }, [player])

  if (!muted) return null

  return (
    <button
      type="button"
      className="mm-sound-gate"
      onClick={() => {
        const el = player.current as unknown as { muted?: boolean } | null
        if (el) el.muted = false
        setMuted(false)
        track('SoundOn', 'video_sound_on', {}, true)
      }}
    >
      <span className="mm-sound-pill">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            fill="currentColor"
            d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 2v2a8 8 0 0 1 0 16v2a10 10 0 0 0 0-20z"
          />
        </svg>
        Tap for sound
      </span>
    </button>
  )
}

// Hero video, shared by the offer page (/meta) and the free-account lander
// (/freeaccount). Renders only once WISTIA_META_ID is set in constants.ts — we
// would rather show no video than the old clip that advertises a retired
// product on screen. The progress bar reflects real playback time reported by
// the player, never a padded number. `badge`, `title` and `source` are the only
// things the two pages differ on.
export function HeroVsl({
  badge = 'Start here',
  title = 'Watch this 120 second video',
  source = 'meta_hero',
}: {
  badge?: string
  title?: string
  source?: string
} = {}) {
  const [pct, setPct] = useState(0)
  const [failed, setFailed] = useState(false)
  const playerRef = useRef<HTMLElement | null>(null)
  const seen = useRef(false)

  useEffect(() => {
    // The player runtime plus the one-file module for this specific media. Both
    // are needed before <wistia-player> upgrades from an inert custom element.
    // Together they pull roughly 350 KB — the price of a VSL that starts on its
    // own. Do NOT put this behind a click again without dropping the autoplay:
    // a clip cannot start by itself if its player only loads once someone taps.
    for (const [src, module] of [
      ['https://fast.wistia.com/player.js', false],
      [`https://fast.wistia.com/embed/${WISTIA_META_ID}.js`, true],
    ] as const) {
      if (document.querySelector(`script[src="${src}"]`)) continue
      const s = document.createElement('script')
      s.src = src
      s.async = true
      if (module) s.type = 'module'
      document.head.appendChild(s)
    }

    // If Wistia is blocked — ad blockers and tracking protection do this often
    // on mobile — the element never upgrades and the reader is left staring at
    // a dead rectangle. Offer the way forward instead.
    const timer = window.setTimeout(() => {
      if (!customElements.get('wistia-player')) setFailed(true)
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Progress comes off the element itself. The _wq queue and its `secondchange`
    // event belong to the old E-v1 embeds: <wistia-player> never registers there,
    // so onReady never ran and the bar sat at 0%. This player emits `timechange`
    // and carries percentWatched as a property.
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
      track('VideoPlay', 'video_start', { source }, true)
    }
    el.addEventListener('timechange', onTime)
    el.addEventListener('play', onPlay)
    return () => {
      el.removeEventListener('timechange', onTime)
      el.removeEventListener('play', onPlay)
    }
  }, [failed, source])

  if (!WISTIA_META_ID) return null

  return (
    <div className="mm-vsl">
      <div className="mm-vsl-head">
        <span className="mm-vsl-badge">{badge}</span>
        <span className="mm-vsl-title">{title}</span>
      </div>
      {/* Plakat jako tlo ramki, zeby przez sekunde bootowania playera nie stala
          tu czarna dziura. Jest NASZ, nie miniaturka ciagnieta z Wistii — ich
          podmiana nie zmienia tego, co widac, trzeba przegenerowac plik.

          UWAGA NA CACHE: public/ leci z max-age=86400 i
          stale-while-revalidate=604800, wiec nadpisanie pod ta sama nazwa
          zostawia wracajacym stary obrazek nawet na tydzien. Przy kazdej
          zmianie plakatu BUMPUJ NUMER (vsl-poster-2 → vsl-poster-3). */}
      <div className="mm-vsl-frame" style={{ backgroundImage: 'url(/vsl-poster-2.webp)' }}>
        {failed ? (
          <div className="mm-vsl-failed">
            <p>The video could not load — an ad blocker or tracking protection is usually the cause.</p>
            <p>You can turn it off for this page, or simply apply below.</p>
          </div>
        ) : (
          /* Startuje SAM i WYCISZONY — z dzwiekiem zablokowalaby to kazda
             przegladarka. silent-autoplay wystawia przycisk "Sound On", ktorym
             widz sam wlacza dzwiek; to jego klikniecie jest gestem, ktorego
             polityka odtwarzania wymaga.

             Controls locked down the same way the reference funnel locks theirs:
             no scrub bar, so the video cannot be skipped to the end. */
          <wistia-player
            ref={playerRef}
            media-id={WISTIA_META_ID}
            aspect="1.7777777777777777"
            player-color={BRAND_GREEN}
            playbar="false"
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
      <div className="mm-vsl-bar">
        <span className="mm-vsl-bar-label">Complete video</span>
        <span className="mm-vsl-bar-track">
          <span className="mm-vsl-bar-fill" style={{ width: `${pct}%` }} />
        </span>
        <span className="mm-vsl-bar-pct">{pct}%</span>
      </div>
    </div>
  )
}

// One client clip. Rendered on /meta and on /reviews, so it lives here.
//
// The player is not embedded until the reader presses play. A row of four
// autoloading YouTube iframes is a third-party script and a few hundred KB each,
// paid for by everyone who scrolls past.
//
// An entry without a videoId keeps its slot and says so. The alternative tried
// earlier — hiding the whole section until a clip exists — meant the reserved
// space read as a gap on the page, and there was nothing to drop a recording
// into. A slot that admits it is empty is honest and still shows the shape.
export function TestimonialCard({ testimonial: t }: { testimonial: Testimonial }) {
  const [playing, setPlaying] = useState(false)
  const empty = !t.videoId

  return (
    <figure className={`mm-testi-card${empty ? ' is-empty' : ''}`}>
      <div className="mm-testi-video">
        {empty ? (
          <span className="mm-testi-soon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 3.5V7l-4 3.5z"
                fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            Clip being filmed
          </span>
        ) : playing ? (
          <iframe
            src={`https://www.youtube.com/embed/${t.videoId}?autoplay=1&rel=0&playsinline=1`}
            title={`${t.name}, client testimonial`}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="mm-testi-play"
            aria-label={`Play ${t.name}'s testimonial`}
            onClick={() => {
              track('TestimonialPlay', 'testimonial_play', { name: t.name }, true)
              setPlaying(true)
            }}
          >
            {/* An <img> rather than a background, so it can be deferred: the
                section is far below the fold and this must not compete with
                the hero. Empty alt — the name and story are already text. */}
            <img className="mm-testi-poster" src={t.poster} alt="" loading="lazy" decoding="async" />
            <span className="mm-testi-play-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
            </span>
          </button>
        )}
      </div>

      {/* A slot has no name, no rating and no payout, so it renders none of
          them. Reaching this with an empty entry used to print five stars and a
          "$0 PAID" pill under a frame that says the clip is still being filmed —
          nobody had seen it because every published entry is filled. */}
      <figcaption className="mm-testi-body">
        {empty ? (
          <span className="mm-testi-pending">Recording pending</span>
        ) : (
          <>
            <span className="mm-testi-name">{t.name}</span>
            {/* Bez gwiazdek. Karta klipu niesie kwotę wypłaty i całą historię —
                ocena była tu ozdobą, a nie dowodem, i konkurowała z kwotą o
                uwagę. Gwiazdki zostają tam, gdzie coś znaczą: w opiniach
                pisanych i w plakietce. */}
            {/* Nie każdy klip podaje kwotę. Plakietka cytuje to, co pada w
                nagraniu, więc gdy nagranie mówi tylko "zapłacili szybko",
                zostaje bez niej — dopisanie liczby byłoby wymyśleniem dowodu. */}
            {t.payoutUsd > 0 && (
              <span className="mm-testi-paid">${t.payoutUsd.toLocaleString('en-US')} PAID</span>
            )}
            <span className="mm-testi-tags">{t.tags.join(' · ')}</span>
            <p className="mm-testi-story">{t.story}</p>
          </>
        )}
      </figcaption>
    </figure>
  )
}

// Payout / stage certificate, reproducing the document Pro Traders Funding
// issues — same structure and artwork as the "Recently issued" strip on
// protradersfunding.com (logo, eyebrow, amount, recipient, metrics, signature,
// verify QR). Assets live in public/cert/.
//
// The QR is the generic /verify code, exactly as PTF does it: their public API
// does not publish per-certificate tokens, so no card can link to a single one.
export function CertCard({ cert }: { cert: PayoutCert }) {
  return (
    <figure
      className={`mm-certcard${cert.payout ? ' is-payout' : ''}`}
      role="listitem"
      aria-label={`${cert.eyebrow} certificate, ${cert.trader}, ${cert.amount}`}
    >
      <div className="mm-certinner">
        <div className="mm-cert-logo">
          <img src="/cert/logo-mark.webp" alt="" width={28} height={28} />
          <span>{PARTNER_FIRM}</span>
        </div>

        <div className="mm-cert-eyebrow"><s /> {cert.eyebrow} <s /></div>
        <h3 className="mm-cert-title">Certificate</h3>

        <div className="mm-cert-amountlabel">{cert.amountLabel}</div>
        <div className="mm-cert-amount">{cert.amount}</div>

        <div className="mm-cert-presented">presented to</div>
        <div className="mm-cert-person">{cert.trader}</div>

        <div className="mm-cert-meta">
          <div><b>{cert.date}</b><span>Date</span></div>
          {cert.metaValue && <div><b>{cert.metaValue}</b><span>{cert.metaLabel}</span></div>}
        </div>

        <div className="mm-cert-foot">
          <div className="mm-cert-sign">
            <b className="mm-sig">Matthew Harrison</b>
            <i className="mm-sig-line" />
            <span>Chief Executive Officer</span>
          </div>
          <div className="mm-cert-qr">
            <span className="mm-qr-box" dangerouslySetInnerHTML={{ __html: VERIFY_QR_SVG }} />
            <span>Scan to verify</span>
          </div>
        </div>
      </div>
    </figure>
  )
}

