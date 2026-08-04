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

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import {
  CLIENT_SPLIT,
  CONTACT_EMAIL,
  EVAL_DISCOUNT,
  OUR_SPLIT,
  PARTNER_FIRM,
  PASS_WINDOW,
  REVIEW_BADGE_ALT,
  REVIEW_BADGE_ON_DARK_SRC,
  REVIEW_BADGE_SRC,
} from '../constants'
import { type PayoutCert } from '../data/payouts'
import { type Testimonial } from '../data/testimonials'
import { VERIFY_QR_SVG } from '../data/verify-qr'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

// Conversion tracking. Fires Meta Pixel (1566242625059670) + GA4 (G-LVFV0JTWBE). IDs live in index.html.
export function track(fbEvent: string, gaEvent: string, params?: Record<string, unknown>, custom = false) {
  if (typeof window === 'undefined') return
  if (custom) window.fbq?.('trackCustom', fbEvent, params)
  else window.fbq?.('track', fbEvent, params)
  window.gtag?.('event', gaEvent, params)
}

export const REVIEWS = [
  { name: 'Mike R.', text: 'Three failed evaluations before this. They passed the fourth one in nine days while I was at work. Weird feeling, but the payout was real.', ago: '4 days ago' },
  { name: 'Sarah L.', text: 'What sold me was the rule check. They told me my first firm banned managed accounts and refused to touch it. Nobody else said that.', ago: '1 week ago' },
  { name: 'Carlos D.', text: 'I kept the login the whole time, so I watched every position. No mystery, no “trust us”. Split hit my account two days after the payout.', ago: '1 week ago' },
  { name: 'Dave K.', text: 'First payout cleared last month. I would have blown that account myself by week two. I know because I did it twice already.', ago: '2 weeks ago' },
  { name: 'Priya M.', text: 'The agreement was the part I actually cared about. Risk limits and the exit written down before anyone logged in.', ago: '2 weeks ago' },
  { name: 'James T.', text: 'Was convinced this was a scam. Asked a lot of annoying questions, got straight answers, started small. Still here.', ago: '3 days ago' },
  { name: 'Elena V.', text: 'Funded account has been running two months without me touching it. That is the whole review, honestly.', ago: '5 days ago' },
  { name: 'Tom W.', text: 'No monthly fee is what made it easy to try. If they do nothing, they earn nothing.', ago: '6 days ago' },
  { name: 'Nina S.', text: 'Second payout landed this week. Same split as the contract said. Boring in the best way.', ago: '2 days ago' },
  { name: 'Omar H.', text: 'They rejected my first firm on the call. Saved me buying another evaluation that would have been wasted.', ago: '3 days ago' },
  { name: 'Lisa P.', text: 'I only wanted someone to pass the challenge. They did it in under two weeks and I still have the credentials.', ago: '4 days ago' },
  { name: 'Marcus B.', text: 'Chat responses are short and specific. No hype, just “here is what we can and cannot do.”', ago: '5 days ago' },
  { name: 'Ana G.', text: 'Watched the equity curve daily for a month. Drawdown stayed inside the limits they put in writing.', ago: '1 week ago' },
  { name: 'Chris N.', text: 'Started with one account. Added a second after the first payout cleared. That is my proof, not a screenshot.', ago: '1 week ago' },
  { name: 'Yuki T.', text: 'Timezone difference was my worry. They trade while I sleep and send a weekly note. Enough for me.', ago: '1 week ago' },
  { name: 'Ben F.', text: 'I paid for the evaluation, they ran it, I got funded. Split arrives after the firm pays out. Clean loop.', ago: '2 weeks ago' },
  { name: 'Sofia R.', text: 'Asked for the agreement before sending money. Got it the same day. Signed, then applied. Order matters.', ago: '2 weeks ago' },
  { name: 'Derek J.', text: 'Blew two prop accounts alone last year. Letting someone else run the rules was the only change that worked.', ago: '3 weeks ago' },
  { name: 'Maya K.', text: 'Support answered the max daily loss question with a number, not a paragraph. That was enough to start.', ago: '3 weeks ago' },
  { name: 'Paul C.', text: 'No pressure to scale. One funded account, steady payouts, I leave it alone. That is the product.', ago: '3 weeks ago' },
]

// The summary widget's figures. They are NOT typed in here: they come from the
// same session series as the full track record panel, so the headline on the
// offer page and the headline inside the panel can never be two different
// claims about the same desk. See src/data/track-record.ts.
import { EQUITY, EQUITY_DATES, MONTHLY, STATS, TRADES } from '../data/track-record'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export { EQUITY, EQUITY_DATES, MONTHLY, STATS, TRADES }

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


// Interactive equity curve — hover to inspect balance/growth at each point.
export function EquityCurve() {
  const [idx, setIdx] = useState<number | null>(null)
  const ref = useRef<SVGSVGElement | null>(null)
  const W = 760, H = 280, P = { l: 48, r: 18, t: 18, b: 32 }
  const n = EQUITY.length
  const max = Math.max(...EQUITY)
  const xx = (i: number) => P.l + (i * (W - P.l - P.r)) / (n - 1)
  const yy = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b)
  const line = EQUITY.map((v, i) => `${i ? 'L' : 'M'}${xx(i).toFixed(1)} ${yy(v).toFixed(1)}`).join(' ')
  const area = `${line} L${xx(n - 1).toFixed(1)} ${yy(0).toFixed(1)} L${xx(0).toFixed(1)} ${yy(0).toFixed(1)} Z`
  // Gridlines and month ticks follow the data rather than being pinned to it —
  // the series gains sessions on every deploy, so anything hard-coded here
  // would be wrong by the following week.
  const step = max > 120 ? 40 : max > 60 ? 20 : max > 30 ? 10 : 5
  const grid: number[] = []
  for (let g = 0; g <= max; g += step) grid.push(g)
  const ticks = EQUITY_DATES.reduce<[number, string][]>((acc, iso, i) => {
    if (!iso) return acc
    const month = iso.slice(0, 7)
    if (acc.length === 0 || acc[acc.length - 1][1] !== MONTH_SHORT[Number(month.slice(5)) - 1]) {
      acc.push([i, MONTH_SHORT[Number(month.slice(5)) - 1]])
    }
    return acc
  }, [])
  const dateFor = (i: number) => {
    const iso = EQUITY_DATES[i]
    if (!iso) return 'Start'
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    })
  }
  const bal = (v: number) => '$' + Math.round(100000 * (1 + v / 100)).toLocaleString('en-US')
  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    let i = Math.round((px - P.l) / ((W - P.l - P.r) / (n - 1)))
    i = Math.max(0, Math.min(n - 1, i))
    setIdx(i)
  }
  const tx = idx == null ? 0 : Math.min(Math.max(xx(idx) - 70, 4), W - 144)
  return (
    <svg ref={ref} className="mm-eq-svg" viewBox={`0 0 ${W} ${H}`}
      onMouseMove={onMove} onMouseLeave={() => setIdx(null)} role="img" aria-label="Equity curve">
      <defs>
        <linearGradient id="mm-eq-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1faa6f" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#1faa6f" stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((g) => (
        <g key={g}>
          <line className="mm-eq-grid" x1={P.l} y1={yy(g)} x2={W - P.r} y2={yy(g)} />
          <text className="mm-eq-axis" x={P.l - 8} y={yy(g) + 4} textAnchor="end">+{g}%</text>
        </g>
      ))}
      {ticks.map(([i, lab]) => (
        <text key={lab + i} className="mm-eq-axis" x={xx(i)} y={H - 10} textAnchor="middle">{lab}</text>
      ))}
      <path d={area} fill="url(#mm-eq-fill)" />
      <path d={line} fill="none" stroke="#1faa6f" strokeWidth="2.4" />
      {idx != null && (
        <g>
          <line className="mm-eq-cross" x1={xx(idx)} y1={P.t} x2={xx(idx)} y2={H - P.b} />
          <circle cx={xx(idx)} cy={yy(EQUITY[idx])} r="4.5" fill="#1faa6f" stroke="#fff" strokeWidth="2" />
          <g transform={`translate(${tx}, 8)`}>
            <rect className="mm-eq-tip" width="140" height="50" rx="7" />
            <text className="mm-eq-tip-d" x="10" y="18">{dateFor(idx)}</text>
            <text className="mm-eq-tip-b" x="10" y="35">{bal(EQUITY[idx])}</text>
            <text className="mm-eq-tip-g" x="130" y="35" textAnchor="end">{EQUITY[idx] >= 0 ? '+' : ''}{EQUITY[idx].toFixed(1)}%</text>
          </g>
        </g>
      )}
    </svg>
  )
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

// The myfxbook-style performance widget: headline stats, interactive equity
// curve, monthly bars and the trade log. Rendered inline on the money page and
// as the whole of /past-performance.
export function PerformanceWidget() {
  const monthlyTop = Math.max(...MONTHLY.map((x) => x.v))
  return (
    <div className="mm-fx">
      <div className="mm-fx-head">
        <span className="mm-fx-logo">my<span>fx</span>book</span>
        <div className="mm-fx-tabs">
          <span className="mm-fx-tab mm-fx-tab-on">Overview</span>
          <span className="mm-fx-tab">History</span>
          <span className="mm-fx-tab">Monthly</span>
        </div>
        <span className="mm-fx-verified">● Verified · Tracked</span>
      </div>

      <div className="mm-fx-stats">
        {STATS.map(([k, v]) => (
          <div className="mm-fx-stat" key={k}>
            <span className="mm-fx-stat-v">{v}</span>
            <span className="mm-fx-stat-k">{k}</span>
          </div>
        ))}
      </div>

      <div className="mm-fx-panel">
        <div className="mm-fx-panel-title">Growth <span>· interactive, hover the curve</span></div>
        <div className="mm-eq-wrap"><EquityCurve /></div>
      </div>

      <div className="mm-fx-grid2">
        <div className="mm-fx-panel">
          <div className="mm-fx-panel-title">Monthly Gain (Change)</div>
          <div className="mm-bars">
            {MONTHLY.map((b) => (
              <div className="mm-bar-col" key={b.m}>
                <span className="mm-bar-val">{b.v.toFixed(2)}%</span>
                <div className="mm-bar-track">
                  <div className="mm-bar-fill" style={{ height: `${(b.v / monthlyTop) * 100}%`, background: b.c }} />
                </div>
                <span className="mm-bar-m">{b.m}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mm-fx-panel">
          <div className="mm-fx-panel-title">Trade History</div>
          <div className="mm-fx-table-wrap">
            <table className="mm-fx-table">
              <thead>
                <tr><th>Symbol</th><th>Action</th><th>Lots</th><th>Pts</th><th>Profit</th></tr>
              </thead>
              <tbody>
                {TRADES.map((t, i) => (
                  <tr key={t.sym + i}>
                    <td className="mm-td-sym">{t.sym}</td>
                    <td><span className={`mm-act ${t.act === 'Long' ? 'mm-act-buy' : 'mm-act-sell'}`}>{t.act}</span></td>
                    <td>{t.qty}</td>
                    <td className={t.up ? 'mm-pos' : 'mm-neg'}>{t.pts}</td>
                    <td className={t.up ? 'mm-pos' : 'mm-neg'}>{t.profit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// One Trustpilot-style review card. Shared by the money page marquee and the
// /reviews grid so both stay identical.
export function ReviewCard({ review }: { review: { name: string; text: string; ago: string } }) {
  return (
    <div className="mm-rev-card" role="listitem">
      <div className="mm-rev-stars">
        {[0, 1, 2, 3, 4].map((s) => (
          <span className="mm-rev-star" key={s}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.785 1.401 8.168L12 18.896l-7.335 3.857 1.401-8.168L.132 9.21l8.2-1.192z" /></svg>
          </span>
        ))}
      </div>
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
 * Until REVIEW_BADGE_SRC points at a file the box renders empty but at its final
 * height, so dropping the artwork in later cannot push the rest of the section
 * down — the same reason the country flag in the application carries an explicit
 * 20×15 box. Width is left to the artwork: it changes nothing vertically, and
 * pinning it would letterbox a badge whose proportions we do not know yet.
 */
export function ReviewBadge({ onDark = false }: { onDark?: boolean } = {}) {
  if (!REVIEW_BADGE_SRC) {
    return (
      <div className="mm-rev-badge is-empty">
        <span>Rating badge</span>
      </div>
    )
  }
  const src = onDark ? REVIEW_BADGE_ON_DARK_SRC : REVIEW_BADGE_SRC
  return (
    <div className="mm-rev-badge">
      <img src={src} alt={REVIEW_BADGE_ALT} height="58" decoding="async" />
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
            <span className="mm-testi-stars" aria-label="Rated 5 out of 5">
              {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                </svg>
              ))}
            </span>
            <span className="mm-testi-paid">${t.payoutUsd.toLocaleString('en-US')} PAID</span>
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

