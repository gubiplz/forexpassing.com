// Forex Passing — chrome and proof widgets shared by every React page.
//
// The money page (/meta) and the footer subpages (/payouts, /past-performance,
// /reviews, /contract) are one design system: same stylesheet, same top bar,
// same footer, same certificate and performance widgets. Everything that more
// than one page renders lives here, so a change lands on all of them at once.

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import {
  CLIENT_SPLIT,
  CONTACT_EMAIL,
  OUR_SPLIT,
  PARTNER_FIRM,
  PASS_WINDOW,
} from '../constants'
import { type PayoutCert } from '../data/payouts'
import { VERIFY_QR_SVG } from '../data/verify-qr'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

// Conversion tracking. Fires Meta Pixel (1566242625059670) + GA4 (G-SP9H8Q95C1). IDs live in index.html.
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
  { name: 'Dave K.', text: 'First payout cleared last month. I would have blown that account myself by week two — I know because I did it twice already.', ago: '2 weeks ago' },
  { name: 'Priya M.', text: 'The agreement was the part I actually cared about. Risk limits and the exit written down before anyone logged in.', ago: '2 weeks ago' },
  { name: 'James T.', text: 'Was convinced this was a scam. Asked a lot of annoying questions, got straight answers, started small. Still here.', ago: '3 days ago' },
  { name: 'Elena V.', text: 'Funded account has been running two months without me touching it. That is the whole review, honestly.', ago: '5 days ago' },
  { name: 'Tom W.', text: 'No monthly fee is what made it easy to try. If they do nothing, they earn nothing.', ago: '6 days ago' },
]

// Cumulative growth (%) per ~weekly point, Jan→Jun 2026. Ends ~+60%.
export const EQUITY = [
  0, 1.2, 2.6, 2.1, 4.0, 5.8, 5.0, 6.4, 7.9, 9.1, 8.3, 10.6, 12.9, 14.4,
  16.0, 19.2, 22.5, 25.4, 27.0, 30.1, 34.5, 39.8, 44.2, 47.8, 54.0, 60.2,
]

export const MONTHLY = [
  { m: 'Jan', v: 5.8, c: '#a589c9' },
  { m: 'Feb', v: 3.1, c: '#e0807e' },
  { m: 'Mar', v: 4.9, c: '#54b4ab' },
  { m: 'Apr', v: 10.98, c: '#f0a869' },
  { m: 'May', v: 16.38, c: '#a9c56d' },
  { m: 'Jun', v: 8.4, c: '#e6c75f' },
]

export const STATS: [string, string][] = [
  ['Gain', '+60.2%'], ['Abs. Gain', '+60.2%'], ['Daily', '0.27%'], ['Monthly', '8.15%'],
  ['Drawdown', '7.41%'], ['Balance', '$160,210'], ['Profit Factor', '2.14'], ['Win Rate', '68%'],
]

export const TRADES = [
  { sym: 'NQ', act: 'Long', qty: '3', pts: '+128.5', profit: '+$7,710', up: true },
  { sym: 'ES', act: 'Short', qty: '4', pts: '+22.25', profit: '+$4,450', up: true },
  { sym: 'MNQ', act: 'Long', qty: '10', pts: '+96.0', profit: '+$1,920', up: true },
  { sym: 'CL', act: 'Long', qty: '2', pts: '+1.18', profit: '+$2,360', up: true },
  { sym: 'GC', act: 'Short', qty: '1', pts: '-9.40', profit: '-$940', up: false },
  { sym: 'RTY', act: 'Long', qty: '3', pts: '+14.6', profit: '+$2,190', up: true },
  { sym: 'YM', act: 'Long', qty: '2', pts: '+186', profit: '+$1,860', up: true },
  { sym: 'NQ', act: 'Short', qty: '2', pts: '+74.0', profit: '+$2,960', up: true },
]


export function TopBar({ href = '#top' }: { href?: string }) {
  return (
    <div className="mm-topbar">
      <a href={href} className="mm-logo"><img className="mm-logo-img" src="/logo.svg" alt="Forex Passing" /></a>
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
        <div className="mm-tcard-row">
          <dt>Account owner</dt>
          <dd>You</dd>
        </div>
      </dl>
      <p className="mm-tcard-foot">
        Trading carries risk. An evaluation can fail — no outcome is guaranteed.
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
            <img className="mm-logo-img mm-logo-img-sm" src="/logo-light.svg" alt="Forex Passing" />
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
          <a href={home} className="mm-footer-logo" aria-label="Forex Passing — home">
            <img className="mm-logo-img mm-logo-img-sm" src="/logo-light.svg" alt="Forex Passing" />
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
            <a href="/" className="mm-footer-logo" aria-label="Forex Passing — home">
              <img className="mm-logo-img mm-logo-img-sm" src="/logo-light.svg" alt="Forex Passing" />
            </a>
            <p className="mm-footer-tagline">
              Forex Passing — we pass prop firm evaluations and manage funded accounts for our
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
  const grid = [0, 15, 30, 45, 60]
  const ticks: [number, string][] = [[0, 'Jan'], [5, 'Feb'], [9, 'Mar'], [13, 'Apr'], [18, 'May'], [23, 'Jun']]
  const dateFor = (i: number) => {
    const d = new Date(2026, 0, 5)
    d.setDate(d.getDate() + i * 7)
    const dd = i === n - 1 ? new Date(2026, 5, 26) : d
    return dd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
        <text key={lab} className="mm-eq-axis" x={xx(i)} y={H - 10} textAnchor="middle">{lab}</text>
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
            <text className="mm-eq-tip-g" x="130" y="35" textAnchor="end">+{EQUITY[idx].toFixed(1)}%</text>
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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

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
    const onDown = (e: PointerEvent) => {
      bump()
      down = true
      startX = e.clientX
      startAcc = acc
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
      acc = wrap(startAcc - (e.clientX - startX))
      apply()
    }
    const onUp = () => { down = false; bump() }

    const frame = (now: number) => {
      if (half > 0 && now >= resumeAt && !down) {
        acc = wrap(acc + (reverse ? -speed : speed))
        apply()
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
        <div className="mm-fx-panel-title">Growth <span>· interactive — hover the curve</span></div>
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
                <tr><th>Symbol</th><th>Action</th><th>Contracts</th><th>Pts</th><th>Profit</th></tr>
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
      aria-label={`${cert.eyebrow} certificate — ${cert.trader} — ${cert.amount}`}
    >
      <div className="mm-certinner">
        <div className="mm-cert-logo">
          <img src="/cert/logo.png" alt="" width={28} height={28} />
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

export const CSS = `
html{scroll-behavior:smooth}
.mm-root{
  --bg:#ffffff; --bg2:#f4f7f5; --line:rgba(15,30,22,.10);
  --txt:#10231a; --mut:#5b675f; --teal:#16a34a; --red:#ef4444;
  --ease:cubic-bezier(.22,.61,.36,1);
  background:var(--bg); color:var(--txt);
  font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  line-height:1.6; -webkit-font-smoothing:antialiased; overflow-x:hidden;
  padding-top:42px; padding-bottom:calc(70px + env(safe-area-inset-bottom));
}
.mm-root *{box-sizing:border-box;margin:0;padding:0}

/* SCROLL-REVEAL — sections fade/slide in once on entry */
.mm-reveal{opacity:0;transform:translateY(18px);will-change:opacity,transform;
  transition:opacity .6s ease, transform .6s var(--ease)}
.mm-reveal.is-in{opacity:1;transform:none}
.mm-wrap{max-width:1080px;margin:0 auto;padding:0 24px}

/* BLUE TICKER — fixed */
.mm-ticker{position:fixed;top:0;left:0;right:0;z-index:70;background:#5ba4d9;border-bottom:3px solid #e5252a;overflow:hidden;padding:10px 0;touch-action:pan-y;transition:transform .35s ease}
.mm-ticker-hidden{transform:translateY(-100%)}
.mm-ticker-track{display:flex;align-items:center;gap:48px;width:max-content;animation:mm-ticker 28s linear infinite;pointer-events:none}
@keyframes mm-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.mm-ticker-item{display:inline-flex;align-items:center;gap:10px;color:#fff;font-size:14px;font-weight:700;white-space:nowrap;letter-spacing:.01em}
.mm-ticker-ico{flex:0 0 22px;width:22px;height:22px;border:2px solid #fff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center}
.mm-ticker-ico svg{width:11px;height:11px;stroke:#fff;fill:none;stroke-width:2.5}

/* TOP BAR — scrolls away with page */
.mm-topbar{background:#fff;border-bottom:1px solid var(--line);padding:16px 24px;text-align:center}
.mm-topbar .mm-logo{display:inline-block;font-size:20px}
.mm-logo{font-weight:800;font-size:20px;letter-spacing:-.02em;color:var(--txt);text-decoration:none}
.mm-logo span{color:var(--teal)}
.mm-logo-img{display:block;height:44px;width:auto}
.mm-logo-img-sm{height:36px}

/* BUTTONS */
.mm-btn{display:inline-block;background:var(--teal);color:#fff;font-weight:700;text-decoration:none;
  border-radius:10px;padding:14px 22px;font-size:15px;border:1px solid var(--teal);
  transition:transform .22s var(--ease), box-shadow .22s var(--ease);box-shadow:0 8px 30px rgba(22,163,74,.18)}
.mm-btn:hover{transform:translateY(-2px);box-shadow:0 14px 40px rgba(22,163,74,.30)}
.mm-btn:active{transform:translateY(0)}
.mm-btn-sm{padding:9px 16px;font-size:13px;border-radius:8px}
.mm-btn-lg{padding:17px 28px;font-size:16px}
.mm-btn-full{display:block;text-align:center;width:100%}
.mm-btn-ghost{background:transparent;color:var(--txt);border:1px solid var(--line);box-shadow:none}
.mm-btn-ghost:hover{border-color:var(--teal);color:var(--teal);box-shadow:none}

/* HEADINGS */
.mm-h1{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(40px,6.4vw,80px);
  line-height:.95;letter-spacing:.005em;text-transform:uppercase;margin:18px 0 22px}
.mm-h2{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(30px,5vw,54px);
  line-height:1.02;text-transform:uppercase;letter-spacing:.01em;margin-bottom:18px}
.mm-h3{font-family:'Anton',sans-serif;font-weight:400;font-size:26px;text-transform:uppercase;margin-bottom:12px}
.mm-center{text-align:center;margin-left:auto;margin-right:auto}
.mm-teal{color:var(--teal)}
.mm-red{color:var(--red)}

.mm-eyebrow{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
  color:var(--mut);border:1px solid var(--line);border-radius:999px;padding:7px 14px}
.mm-eyebrow-teal{color:var(--teal);border-color:rgba(22,163,74,.35)}
.mm-eyebrow-c{display:block;width:-moz-fit-content;width:fit-content;margin:0 auto 14px}
.mm-lead{font-size:clamp(17px,2.2vw,20px);color:var(--mut);max-width:640px;line-height:1.6}
.mm-lead-mid{margin-left:auto;margin-right:auto}

/* HERO */
.mm-hero{position:relative;padding:74px 0 70px;overflow:hidden}
.mm-hero .mm-wrap{position:relative;z-index:1}
.mm-hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;text-align:left}
@media(max-width:900px){.mm-hero-grid{grid-template-columns:1fr;gap:34px;text-align:center}}
.mm-hero-grid .mm-lead{margin:0;max-width:560px}
@media(max-width:900px){.mm-hero-grid .mm-lead{margin:0 auto}}
.mm-hero-copy .mm-h1{margin:16px 0 18px}
.mm-cta-row{display:flex;gap:14px;flex-wrap:wrap;margin:26px 0 14px}
.mm-cta-left{justify-content:flex-start}
@media(max-width:900px){.mm-cta-row{justify-content:center}}
.mm-microtrust{font-size:13px;color:var(--mut);letter-spacing:.05em;text-transform:uppercase}
.mm-hero-points{list-style:none;margin:20px 0 6px;display:grid;gap:11px}
.mm-hero-points li{position:relative;padding-left:28px;font-size:15px;color:var(--txt)}
.mm-hero-points li:before{content:"";position:absolute;left:0;top:6px;width:14px;height:8px;border-left:2px solid var(--teal);border-bottom:2px solid var(--teal);transform:rotate(-45deg)}
.mm-hero-glow{position:absolute;top:-180px;left:50%;transform:translateX(-50%);width:760px;height:520px;
  background:radial-gradient(closest-side,rgba(22,163,74,.18),transparent 70%);pointer-events:none;z-index:0}
.mm-hero-card{display:flex;justify-content:center}

/* TERMS CARD — hero */
.mm-tcard{width:100%;max-width:390px;background:#0c1512;color:#e8f0ec;border:1px solid rgba(255,255,255,.08);
  border-radius:18px;padding:22px;box-shadow:0 24px 60px rgba(8,20,15,.45);text-align:left}
.mm-tcard-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.mm-tcard-title{font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.06em;color:#fff}
.mm-tcard-rows{display:grid;gap:2px}
.mm-tcard-row{display:flex;align-items:baseline;justify-content:space-between;gap:14px;
  padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07)}
.mm-tcard-row:last-child{border-bottom:none}
.mm-tcard-row dt{font-size:13px;color:#9fb0a8}
.mm-tcard-row dd{font-size:14px;font-weight:700;color:#e8f0ec;text-align:right}
.mm-tcard-row dd.mm-tcard-strong{font-family:'Anton',sans-serif;font-weight:400;font-size:22px;color:#39d98a}
.mm-tcard-foot{font-size:11px;color:#8a988f;margin-top:14px;line-height:1.5}
@keyframes mm-pulse{0%{box-shadow:0 0 0 0 rgba(57,217,138,.55)}70%{box-shadow:0 0 0 8px rgba(57,217,138,0)}100%{box-shadow:0 0 0 0 rgba(57,217,138,0)}}

/* STAT HOOK */
.mm-stathook{background:#0c1512;color:#fff;text-align:center;padding:56px 0}
.mm-stathook-big{font-family:'Anton',sans-serif;font-size:clamp(64px,14vw,150px);line-height:.9;color:#ff6b5d}
.mm-stathook-text{font-size:clamp(16px,2.4vw,22px);font-weight:700;max-width:680px;margin:14px auto 0;color:#e8f0ec}

/* SECTIONS */
.mm-section{padding:84px 0}
@media(max-width:760px){.mm-section{padding:56px 0}}
.mm-pain{background:var(--bg2);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.mm-pain-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;
  max-width:860px;margin:34px auto 0}
.mm-pain-step{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--line);
  border-radius:12px;padding:15px 18px}
.mm-pain-n{flex:0 0 auto;font-family:'Anton',sans-serif;font-weight:400;font-size:20px;line-height:1;
  color:var(--teal);letter-spacing:.02em}
.mm-pain-t{font-size:15px;font-weight:600;line-height:1.4}
.mm-pain-step-last{border-color:rgba(239,68,68,.4);background:rgba(239,68,68,.05)}
.mm-pain-step-last .mm-pain-n{color:var(--red)}
.mm-pain-step-last .mm-pain-t{color:var(--red)}
.mm-pain-note{font-size:clamp(16px,2.2vw,20px);font-weight:700;line-height:1.5;max-width:700px;
  margin:32px auto 0;text-align:center}

/* PAIN SPIRAL */
.mm-spiral{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:34px 0 26px}
@media(max-width:760px){.mm-spiral{grid-template-columns:repeat(2,1fr)}}
.mm-step{border:1px solid var(--line);border-radius:12px;padding:18px 16px;background:rgba(0,0,0,.02)}
.mm-step-n{display:block;font-family:'Anton',sans-serif;font-size:22px;color:var(--mut);opacity:.5}
.mm-step-t{display:block;font-weight:700;font-size:15px;margin-top:6px}
.mm-step-hot{border-color:rgba(255,90,77,.35);background:rgba(255,90,77,.06)}
.mm-step-hot .mm-step-t{color:var(--red)}
.mm-pain-out{font-size:clamp(18px,2.6vw,24px);font-weight:700;max-width:760px;line-height:1.4}

/* MECHANISM */
.mm-states{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:0 0 24px}
@media(max-width:760px){.mm-states{grid-template-columns:1fr}}
.mm-state{border-radius:14px;padding:26px 22px;border:1px solid var(--line);background:rgba(0,0,0,.02)}
.mm-state-label{font-family:'Anton',sans-serif;font-size:30px;letter-spacing:.02em}
.mm-state-sub{display:block;color:var(--mut);font-size:14px;margin-top:8px}
.mm-state-go{border-color:rgba(22,163,74,.4)}
.mm-state-go .mm-state-label{color:var(--teal)}
.mm-state-wait{border-color:rgba(217,119,6,.4)}
.mm-state-wait .mm-state-label{color:#d97706}
.mm-state-no{border-color:rgba(255,90,77,.4)}
.mm-state-no .mm-state-label{color:var(--red)}
.mm-mech-note{font-size:18px;margin:6px 0 0}

/* BAND */
.mm-band{background:var(--teal);color:#fff;text-align:center;padding:54px 0}
.mm-band-text{font-family:'Anton',sans-serif;font-size:clamp(34px,6vw,66px);text-transform:uppercase;letter-spacing:.01em;line-height:1}
.mm-band-sub{font-weight:700;font-size:clamp(15px,2vw,18px);margin-top:12px;opacity:.85}

/* SYSTEM / VALUE STACK */
.mm-sys-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:34px 0 22px}
@media(max-width:760px){.mm-sys-grid{grid-template-columns:1fr}}
.mm-sys-card{position:relative;border:1px solid var(--line);border-radius:14px;padding:20px 22px;background:rgba(0,0,0,.02)}
.mm-sys-card-core{border-color:rgba(22,163,74,.4);background:rgba(22,163,74,.05)}
.mm-sys-tag{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.12em;color:#fff;background:var(--teal);border-radius:6px;padding:3px 8px;margin-bottom:10px}
.mm-sys-t{display:block;font-weight:800;font-size:17px;margin-bottom:6px}
.mm-sys-d{display:block;color:var(--mut);font-size:14px;line-height:1.55}
.mm-sys-total{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;border:1px dashed rgba(22,163,74,.4);border-radius:14px;padding:18px 24px;font-weight:700;text-align:center}
.mm-sys-total-now{font-family:'Anton',sans-serif;font-size:20px;color:var(--teal);line-height:1.3}
.mm-guarantee-fine{font-size:13px;color:var(--mut);line-height:1.6;max-width:720px;margin:14px auto 0;text-align:center}

/* WHO IT'S FOR */
.mm-whofor{background:var(--bg2);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.mm-whofor-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:30px}
@media(max-width:760px){.mm-whofor-grid{grid-template-columns:1fr}}
.mm-whofor-card{border:1px solid var(--line);border-radius:14px;padding:24px;background:#fff}
.mm-whofor-t{display:block;font-family:'Anton',sans-serif;font-size:20px;text-transform:uppercase;margin-bottom:8px}
.mm-whofor-d{display:block;color:var(--mut);font-size:14px;line-height:1.6}

/* PAYOUTS / REVIEWS SCROLLER (drag + auto-advance) */
.mm-payouts{overflow:hidden}
.mm-scroller{overflow:hidden;touch-action:pan-y;cursor:grab;
  user-select:none;-webkit-user-select:none;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.mm-scroller:active{cursor:grabbing}
.mm-scroller-lock{cursor:default}
.mm-scroller::-webkit-scrollbar{display:none}
.mm-scroller-track{display:flex;width:max-content}
.mm-scroller img{-webkit-user-drag:none;user-select:none;pointer-events:none}
.mm-scroller-cert{margin:42px 0 28px}
.mm-scroller-cert .mm-scroller-track{gap:22px;align-items:stretch}
.mm-disclaimer{font-size:13px;color:var(--mut);line-height:1.6;max-width:760px;margin:0 auto;text-align:center}

/* ===== PAYOUT CERTIFICATE =====
   Reproduction of the document Pro Traders Funding issues, ported from their
   cert.css so the card on this page and the real certificate cannot drift.
   Sizes use container units (cqw) against a fixed 340px card, exactly like the
   original scales against its 620px design width. Fonts + artwork: public/cert/. */
@font-face{font-family:'CertDisplay';src:url('/cert/space-grotesk-latin.woff2') format('woff2');
  font-weight:400 700;font-style:normal;font-display:swap}
@font-face{font-family:'CertMono';src:url('/cert/jbmono.woff2') format('woff2');
  font-weight:400 600;font-style:normal;font-display:swap}
@font-face{font-family:'CertSignature';src:url('/cert/signature.woff2') format('woff2');
  font-weight:400;font-style:normal;font-display:block}

.mm-certcard{container-type:inline-size;flex:0 0 auto;position:relative;
  width:340px;padding:4px;border-radius:16px;
  background:linear-gradient(150deg,#67d2ff 0%,#2b8bff 38%,#1b4bd8 68%,#67d2ff 100%);
  box-shadow:0 0 30px rgba(43,139,255,.34),0 22px 50px -30px #000}
.mm-certinner{position:relative;overflow:hidden;isolation:isolate;aspect-ratio:1/1;
  display:flex;flex-direction:column;align-items:center;text-align:center;
  padding:clamp(14px,4cqw,26px);border-radius:12px;color:#f2f6ff;
  background:
    radial-gradient(62% 44% at 50% 4%, rgba(43,139,255,.24) 0%, rgba(43,139,255,0) 64%),
    url('/cert/cert-motif.svg') center bottom/102% auto no-repeat,
    linear-gradient(168deg,#0b142c 0%,#070d1e 52%,#050914 100%)}
/* watermark: the issuer logo behind the content */
.mm-certinner::before{content:"";position:absolute;z-index:-2;left:50%;top:48%;translate:-50% -50%;
  width:74%;aspect-ratio:1/1;background:url('/cert/logo.png') center/contain no-repeat;opacity:.055}
/* guilloche engraving so the plate does not read as empty */
.mm-certinner::after{content:"";position:absolute;z-index:-1;inset:-8%;
  background:url('/cert/guilloche.svg') center/contain no-repeat;opacity:.16;mix-blend-mode:screen;pointer-events:none}

.mm-cert-logo{display:flex;align-items:center;gap:.45em;font-size:clamp(11px,3.6cqw,17px)}
.mm-cert-logo img{width:1.4em;height:1.4em}
.mm-cert-logo span{font-family:'CertDisplay',sans-serif;font-weight:700;letter-spacing:-.015em}

.mm-cert-eyebrow{display:flex;align-items:center;justify-content:center;gap:clamp(6px,1.7cqw,10px);
  margin-top:clamp(7px,2.4cqw,12px);width:min(76%,300px);
  font-family:'CertDisplay',sans-serif;font-weight:700;text-transform:uppercase;
  letter-spacing:.3em;font-size:clamp(6.5px,1.75cqw,9px);color:#67d2ff;white-space:nowrap}
.mm-cert-eyebrow s{flex:1;height:1px;text-decoration:none;
  background:linear-gradient(90deg,transparent,rgba(120,170,255,.22),transparent)}
.mm-cert-title{font-family:'CertDisplay',sans-serif;font-weight:800;text-transform:uppercase;
  letter-spacing:.06em;font-size:clamp(16px,5.1cqw,25px);line-height:1;margin:clamp(2px,.8cqw,4px) 0 0}
.mm-cert-amountlabel{font-family:'CertDisplay',sans-serif;font-weight:600;text-transform:uppercase;
  letter-spacing:.19em;font-size:clamp(6px,1.7cqw,8.5px);color:#93a3c9;margin-top:clamp(5px,1.7cqw,9px)}
.mm-cert-amount{font-family:'CertDisplay',sans-serif;font-weight:800;letter-spacing:-.035em;
  font-size:clamp(26px,11.2cqw,52px);line-height:1;margin-top:clamp(1px,.5cqw,3px);
  text-shadow:0 0 30px rgba(103,210,255,.45),0 0 70px rgba(43,139,255,.3)}
.mm-cert-presented{font-size:clamp(7px,1.85cqw,9.5px);color:#93a3c9;margin-top:clamp(4px,1.4cqw,7px)}
.mm-cert-person{font-family:'CertDisplay',sans-serif;font-weight:700;letter-spacing:-.015em;
  font-size:clamp(14px,4.6cqw,23px);line-height:1.12;margin-top:clamp(1px,.4cqw,3px);
  color:#e8c47c;text-shadow:0 0 18px rgba(232,196,124,.22)}
.mm-cert-meta{display:flex;justify-content:center;gap:clamp(12px,4.6cqw,28px);margin-top:clamp(6px,1.9cqw,10px)}
.mm-cert-meta div{display:flex;flex-direction:column;align-items:center;gap:.22em}
.mm-cert-meta b{font-family:'CertMono',ui-monospace,monospace;font-weight:600;letter-spacing:-.01em;
  font-size:clamp(9px,2.9cqw,14px)}
.mm-cert-meta span{font-family:'CertDisplay',sans-serif;font-weight:600;text-transform:uppercase;
  letter-spacing:.15em;font-size:clamp(5.5px,1.35cqw,7.5px);color:#93a3c9}

/* payout variant — green amount and its own motif */
.mm-certcard.is-payout .mm-cert-amount{color:#57e6b6;
  text-shadow:0 0 30px rgba(95,240,192,.4),0 0 70px rgba(15,157,108,.3)}
.mm-certcard.is-payout .mm-certinner{
  background:
    radial-gradient(62% 44% at 50% 4%, rgba(43,139,255,.24) 0%, rgba(43,139,255,0) 64%),
    url('/cert/cert-motif-payout.svg') center bottom/102% auto no-repeat,
    linear-gradient(168deg,#0b142c 0%,#070d1e 52%,#050914 100%)}

.mm-cert-foot{margin-top:auto;width:100%;display:grid;grid-template-columns:1fr auto;align-items:end;
  gap:clamp(8px,2.4cqw,14px);padding:clamp(7px,2cqw,11px) clamp(10px,6cqw,24px) 0;
  border-top:1px solid rgba(120,170,255,.22)}
.mm-cert-sign{display:flex;flex-direction:column;align-items:center;gap:0;justify-self:start;
  text-align:center;min-width:0;margin-bottom:clamp(14px,7.1cqw,26px)}
.mm-sig-line{align-self:stretch;height:1px;
  background:linear-gradient(90deg,transparent,rgba(147,163,201,.7) 18%,rgba(147,163,201,.7) 82%,transparent)}
.mm-sig{font-family:'CertSignature','Snell Roundhand','Segoe Script',cursive;font-weight:400;
  font-size:clamp(18px,6.4cqw,32px);line-height:.85;letter-spacing:-.01em;color:#e8edff;
  display:inline-block;transform:rotate(-4deg) skewX(-3deg);text-shadow:0 0 1px rgba(232,237,255,.3);
  margin-bottom:-.22em;padding:0 .4em .02em}
.mm-cert-sign span{font-family:'CertDisplay',sans-serif;font-weight:600;text-transform:uppercase;
  letter-spacing:.14em;font-size:clamp(4.5px,1.3cqw,6.5px);color:#93a3c9;margin-top:.5em}
.mm-cert-qr{display:flex;flex-direction:column;align-items:center;gap:.4em}
.mm-qr-box{display:block;width:clamp(38px,13cqw,54px);aspect-ratio:1/1;background:#fff;
  border-radius:5px;padding:3px}
.mm-qr-box svg{display:block;width:100%;height:100%}
.mm-cert-qr>span{font-family:'CertDisplay',sans-serif;font-weight:600;text-transform:uppercase;
  letter-spacing:.12em;font-size:clamp(4.5px,1.2cqw,6px);color:#93a3c9}

/* PRICING */
.mm-price-proof{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:14px 20px;margin-bottom:30px;
  padding:14px 22px;border:1px solid var(--line);border-radius:999px;background:var(--bg2);max-width:680px;margin-left:auto;margin-right:auto}
.mm-price-proof-item{font-size:14px;color:var(--mut);white-space:nowrap}
.mm-price-proof-item strong{color:var(--txt);font-weight:800}
.mm-price-proof-sep{width:5px;height:5px;border-radius:50%;background:var(--teal);flex:0 0 auto}
@media(max-width:520px){.mm-price-proof{border-radius:16px}.mm-price-proof-sep{display:none}}
.mm-price-wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:36px;align-items:center}
@media(max-width:820px){.mm-price-wrap{grid-template-columns:1fr}}
.mm-price-card{border:1px solid rgba(22,163,74,.35);border-radius:18px;padding:34px;background:rgba(22,163,74,.04)}
.mm-price-urgency{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#b91c1c;
  background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:999px;padding:7px 14px;margin-bottom:16px}
.mm-price-urgency-dot{width:8px;height:8px;border-radius:50%;background:#ef4444;animation:mm-blink 1.4s infinite}
@keyframes mm-blink{0%,100%{opacity:1}50%{opacity:.25}}
.mm-count{font-variant-numeric:tabular-nums;font-weight:800;letter-spacing:.04em}
.mm-price-tag{display:block;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--teal);margin-bottom:16px}
.mm-price-list{list-style:none;margin:0 0 26px}
.mm-price-list li{position:relative;padding:9px 0 9px 28px;border-bottom:1px solid var(--line);font-size:15px}
.mm-price-list li:before{content:"";position:absolute;left:0;top:14px;width:14px;height:8px;border-left:2px solid var(--teal);border-bottom:2px solid var(--teal);transform:rotate(-45deg)}
.mm-price-fine{font-size:12px;color:var(--mut);margin-top:14px;text-align:center}
.mm-price-side h3{color:var(--txt)}
.mm-price-side p{color:var(--mut);font-size:16px;margin-bottom:14px}
.mm-price-side-strong{color:var(--txt)!important;font-weight:700}

/* APPLICATION QUESTIONNAIRE */
.mm-form{display:grid;gap:18px;text-align:left}
.mm-field{display:grid;gap:6px}
.mm-field label{font-size:13px;font-weight:600;color:var(--txt)}
.mm-field-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:520px){.mm-field-row{grid-template-columns:1fr}}
.mm-input,.mm-textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:13px 14px;
  font-size:15px;font-family:inherit;background:#fff;color:var(--txt);transition:border-color .15s,box-shadow .15s}
.mm-input:focus,.mm-textarea:focus{outline:none;border-color:var(--teal);box-shadow:0 0 0 3px rgba(22,163,74,.15)}
.mm-textarea{min-height:110px;resize:vertical}
.mm-form-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:2px}
.mm-form-nav .mm-btn{margin-left:auto}
.mm-form-btn:disabled{opacity:.6;cursor:default;transform:none;box-shadow:none}
.mm-link-btn{background:none;border:none;font-family:inherit;font-size:14px;font-weight:600;color:var(--mut);
  cursor:pointer;padding:6px 2px;text-decoration:underline;text-underline-offset:3px}
.mm-link-btn:hover{color:var(--teal)}
.mm-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none}
.mm-form-err{font-size:13px;color:#c0392b;margin-top:2px}
.mm-form-fine{font-size:12px;color:var(--mut);margin-top:2px;line-height:1.5}
.mm-form-ok{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;
  border:1px solid rgba(22,163,74,.35);background:rgba(22,163,74,.05);border-radius:16px;padding:32px 24px}
.mm-form-ok-ico{width:46px;height:46px;border-radius:50%;background:var(--teal);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800}
.mm-form-ok-t{font-family:'Anton',sans-serif;font-size:22px;text-transform:uppercase;letter-spacing:.02em}
.mm-form-ok-d{color:var(--mut);font-size:14px;line-height:1.6;max-width:420px}
.mm-form-ok-d a{color:var(--teal)}

/* FAQ */
.mm-faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:30px}
@media(max-width:760px){.mm-faq-grid{grid-template-columns:1fr}}
.mm-faq-item{border:1px solid var(--line);border-radius:12px;padding:22px;background:rgba(0,0,0,.02)}
.mm-faq-q{display:block;font-weight:700;font-size:16px;margin-bottom:8px}
.mm-faq-a{display:block;color:var(--mut);font-size:14px;line-height:1.6}

/* FOOTER — dark band. Two variants: "wide" (three columns, every page) and
   "meta" (logo + one row of proof links, offer page only). */
.mm-footer{background:#0c1411;padding:60px 0 40px;color:#e6efea}
.mm-footer-logo{display:inline-block}

/* wide */
.mm-footer-top{display:grid;grid-template-columns:1.7fr 1fr 1fr;gap:44px}
.mm-footer-brand{display:flex;flex-direction:column;align-items:flex-start;gap:16px}
.mm-footer-tagline{font-size:13.5px;line-height:1.7;color:rgba(230,239,234,.56);max-width:380px}
.mm-footer-col{display:flex;flex-direction:column;gap:11px}
.mm-footer-h{font-family:'Anton',sans-serif;font-weight:400;font-size:15px;letter-spacing:.06em;
  text-transform:uppercase;color:#fff;margin-bottom:5px}
.mm-footer-col a{color:rgba(230,239,234,.6);text-decoration:none;font-size:14px;transition:color .15s}
.mm-footer-col a:hover{color:#4ade80}
.mm-footer-rule{border:0;border-top:1px solid rgba(230,239,234,.1);margin:44px 0 26px}
.mm-footer-copy{font-size:12px;color:rgba(230,239,234,.34)}
.mm-footer-copy-center{text-align:center;margin:0}

/* meta + referral + proof + blank */
.mm-footer-meta,
.mm-footer-referral,
.mm-footer-proof{padding:52px 0 48px}
.mm-footer-blank{padding:44px 0 40px}
.mm-footer-fine{font-size:11.5px;color:rgba(230,239,234,.42);line-height:1.7;max-width:820px;margin:0;text-align:center}
.mm-footer-center{display:flex;flex-direction:column;align-items:center;text-align:center;gap:22px}
.mm-footer-nav{display:flex;gap:26px;flex-wrap:wrap;justify-content:center}
.mm-footer-nav a{color:rgba(230,239,234,.6);text-decoration:none;font-size:14px;transition:color .15s}
.mm-footer-nav a:hover{color:#4ade80}

@media (max-width:860px){
  .mm-footer-top{grid-template-columns:1fr 1fr;gap:32px}
  .mm-footer-brand{grid-column:1 / -1}
}
@media (max-width:560px){
  .mm-footer-top{grid-template-columns:1fr;gap:30px}
}
.mm-logo-sm{font-size:16px}
.mm-footer-copy{font-size:12px;color:var(--mut)}
.mm-footer-center{display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px}
.mm-footer-nav{display:flex;gap:22px;flex-wrap:wrap;justify-content:center}
.mm-footer-nav a{color:var(--mut);text-decoration:none;font-size:14px;transition:color .15s}
.mm-footer-nav a:hover{color:var(--teal)}

/* VERIFIED PERFORMANCE — myfxbook-style light widget */
.mm-perf{background:var(--bg2);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.mm-fx{margin:42px auto 22px;max-width:900px;background:#fff;color:#1f2d27;border-radius:16px;overflow:hidden;
  border:1px solid rgba(0,0,0,.08);box-shadow:0 18px 50px rgba(15,30,22,.12)}
.mm-fx-head{display:flex;align-items:center;gap:14px;padding:14px 18px;background:#fafbfa;border-bottom:1px solid #eceeed}
.mm-fx-logo{font-weight:800;font-size:18px;color:#2b2b2b;letter-spacing:-.02em}
.mm-fx-logo span{color:#f08c00;font-style:italic}
.mm-fx-tabs{display:flex;gap:6px;margin-left:6px}
.mm-fx-tab{font-size:12px;color:#7a857f;padding:5px 12px;border-radius:6px}
.mm-fx-tab-on{background:#eaf6f0;color:#1faa6f;font-weight:700}
.mm-fx-verified{margin-left:auto;font-size:12px;color:#1faa6f;font-weight:700;white-space:nowrap}
@media(max-width:600px){.mm-fx-tabs{display:none}}
.mm-fx-stats{display:grid;grid-template-columns:repeat(8,1fr);border-bottom:1px solid #eceeed}
@media(max-width:760px){.mm-fx-stats{grid-template-columns:repeat(4,1fr)}}
@media(max-width:420px){.mm-fx-stats{grid-template-columns:repeat(2,1fr)}}
.mm-fx-stat{padding:14px 8px;text-align:center;border-right:1px solid #f1f3f2}
.mm-fx-stat-v{display:block;font-weight:800;font-size:16px;color:#1f2d27}
.mm-fx-stat-k{display:block;font-size:10px;color:#8a948e;margin-top:3px;text-transform:uppercase;letter-spacing:.04em}
.mm-fx-panel{padding:18px}
.mm-fx-panel-title{font-size:13px;font-weight:700;color:#41504a;margin-bottom:12px}
.mm-fx-panel-title span{font-weight:500;color:#9aa49e}
.mm-eq-wrap{width:100%}
.mm-eq-svg{width:100%;height:auto;display:block;touch-action:none}
.mm-eq-grid{stroke:#eef1ef;stroke-width:1}
.mm-eq-axis{fill:#9aa49e;font-size:10px;font-family:Inter,sans-serif}
.mm-eq-cross{stroke:#c7d0cb;stroke-width:1;stroke-dasharray:4 3}
.mm-eq-tip{fill:#1f2d27;opacity:.96}
.mm-eq-tip-d{fill:#cfd8d3;font-size:11px;font-family:Inter,sans-serif}
.mm-eq-tip-b{fill:#fff;font-size:13px;font-weight:700;font-family:Inter,sans-serif}
.mm-eq-tip-g{fill:#39d98a;font-size:12px;font-weight:700;font-family:Inter,sans-serif}
.mm-fx-grid2{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #eceeed}
@media(max-width:760px){.mm-fx-grid2{grid-template-columns:1fr}}
.mm-fx-grid2 .mm-fx-panel:first-child{border-right:1px solid #eceeed}
@media(max-width:760px){.mm-fx-grid2 .mm-fx-panel:first-child{border-right:none;border-bottom:1px solid #eceeed}}
.mm-bars{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;height:200px;padding-top:18px}
.mm-bar-col{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;justify-content:flex-end}
.mm-bar-val{font-size:11px;font-weight:700;color:#41504a;margin-bottom:6px}
.mm-bar-track{width:100%;max-width:46px;flex:1;display:flex;align-items:flex-end}
.mm-bar-fill{width:100%;border-radius:5px 5px 0 0;min-height:4px;transition:height .6s ease}
.mm-bar-m{font-size:11px;color:#8a948e;margin-top:8px}
.mm-fx-table-wrap{overflow-x:auto}
.mm-fx-table{width:100%;border-collapse:collapse;font-size:13px}
.mm-fx-table th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#9aa49e;padding:8px 10px;border-bottom:1px solid #eceeed}
.mm-fx-table td{padding:9px 10px;border-bottom:1px solid #f4f6f5;color:#2b3a33;white-space:nowrap}
.mm-td-sym{font-weight:700}
.mm-act{font-size:11px;font-weight:700;padding:2px 8px;border-radius:5px}
.mm-act-buy{background:#e6f7ef;color:#1faa6f}
.mm-act-sell{background:#fdeceb;color:#e0544a}
.mm-pos{color:#1faa6f;font-weight:600}
.mm-neg{color:#e0544a;font-weight:600}

/* REVIEWS (Trustpilot-style) */
.mm-reviews{background:var(--teal);color:#fff;overflow:hidden;padding:64px 0}
.mm-reviews-h{color:#fff;margin-bottom:8px}
.mm-reviews-sub{text-align:center;font-size:clamp(15px,2vw,18px);opacity:.9}
.mm-reviews-sub strong{font-weight:800}
.mm-reviews .mm-scroller-rev{margin:34px 0 0}
.mm-reviews .mm-scroller-rev+.mm-scroller-rev{margin-top:20px}
.mm-scroller-rev .mm-scroller-track{gap:20px}
.mm-rev-card{flex:0 0 330px;width:330px;background:#fff;border-radius:14px;padding:22px 24px;box-shadow:0 10px 28px rgba(0,0,0,.16);text-align:left;color:var(--txt);display:flex;flex-direction:column}
.mm-rev-stars{display:flex;gap:3px;margin-bottom:14px}
.mm-rev-star{width:22px;height:22px;background:#00b67a;display:inline-flex;align-items:center;justify-content:center;border-radius:2px}
.mm-rev-star svg{width:14px;height:14px;fill:#fff}
.mm-rev-name{font-weight:700;font-size:15px;margin-bottom:8px}
.mm-rev-text{font-size:14px;color:#2b3a33;line-height:1.55;margin-bottom:16px;flex:1}
.mm-rev-meta{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#9aa49e}
.mm-rev-verified{display:inline-flex;align-items:center;gap:5px;color:var(--teal);font-weight:600}

/* LETTER / CLOSER */
/* LETTER — long-form. Narrow measure, generous gaps, and the rhythm carried by
   line breaks inside paragraphs rather than by prose. */
.mm-letter{background:var(--bg);border-top:1px solid var(--line)}
.mm-letter-body{max-width:600px;margin:0 auto;font-size:16px;line-height:1.62;color:var(--txt);text-align:left}
.mm-letter-body p{margin:0 0 1.35em}
.mm-letter-lead{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(30px,4.4vw,42px);
  line-height:1.05;text-transform:none;letter-spacing:-.01em;text-align:center;margin:0 0 2em}
.mm-letter-punch{font-weight:800;font-size:17.5px;line-height:1.5}
.mm-letter-aside{font-style:italic;color:var(--mut)}
.mm-letter-big{font-weight:800;font-size:clamp(20px,2.6vw,24px);line-height:1.3}
.mm-letter-num{font-weight:800;font-size:1.22em}
.mm-letter-list{list-style:none;margin:0 0 1.35em;padding:0;display:flex;flex-direction:column;gap:.5em}
.mm-letter-list li{position:relative;padding-left:20px}
.mm-letter-list li::before{content:"•";position:absolute;left:4px;color:var(--mut)}
.mm-letter-rule{border:0;width:44px;height:1px;background:var(--line);margin:2.4em auto}
.mm-letter-box{border:1px solid rgba(22,163,74,.32);background:rgba(22,163,74,.05);border-radius:14px;
  padding:20px 22px;margin:0 0 1.35em}
.mm-letter-box p:last-child{margin-bottom:0}
.mm-letter-sign{color:var(--mut);font-size:15px;margin-top:2.2em}
.mm-letter-cta-wrap{text-align:center;margin-top:2.2em}

/* STICKY CTA */
.mm-sticky-cta{position:fixed;left:0;right:0;bottom:0;z-index:60;display:block;text-align:center;
  background:var(--teal);color:#fff;font-weight:800;text-decoration:none;font-size:16px;
  padding:18px 16px;padding-bottom:max(18px,env(safe-area-inset-bottom));
  letter-spacing:.01em;box-shadow:0 -8px 30px rgba(0,0,0,.45);
  transition:transform .3s cubic-bezier(.22,.61,.36,1),opacity .3s cubic-bezier(.22,.61,.36,1)}
.mm-sticky-cta:hover{background:#15803d}
.mm-sticky-cta.is-hidden{transform:translateY(130%);opacity:0;pointer-events:none}

@media (prefers-reduced-motion: reduce){
  html{scroll-behavior:auto}
  .mm-ticker-track{animation:none}
  .mm-price-urgency-dot{animation:none}
  .mm-reveal{opacity:1;transform:none;transition:none}
  .mm-btn{transition:none}
}

/* ---------------------------------------------------------------------------
 * OFFER PAGE — sections modelled on the reference funnel.
 * ------------------------------------------------------------------------- */

/* Red warning line under the headline and above the form */
.mm-warn{display:block;max-width:660px;margin:18px auto 0;font-size:14.5px;font-weight:700;
  line-height:1.55;color:#c81e1e;text-align:center}
.mm-warn-mb{margin-bottom:22px}

/* Hero VSL card */
.mm-vsl{max-width:760px;margin:34px auto 0;border-radius:16px;overflow:hidden;
  box-shadow:0 26px 70px -34px rgba(0,0,0,.55);background:var(--teal)}
.mm-vsl-head{padding:12px 18px 14px;text-align:center;color:#fff}
.mm-vsl-badge{display:block;font-size:11px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;opacity:.85}
.mm-vsl-title{display:block;font-size:17px;font-weight:800;margin-top:3px}
.mm-vsl-frame{position:relative;aspect-ratio:16/9;background:#000}
.mm-vsl-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.mm-vsl-bar{display:flex;align-items:center;gap:12px;padding:10px 16px 12px;color:#fff}
.mm-vsl-bar-label{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}
.mm-vsl-bar-track{flex:1;height:6px;border-radius:99px;background:rgba(255,255,255,.3);overflow:hidden}
.mm-vsl-bar-fill{height:100%;background:#fff;border-radius:99px;transition:width .4s linear}
.mm-vsl-bar-pct{font-size:12px;font-weight:800;min-width:34px;text-align:right}

/* Check rows — "what you keep control of", guarantees */
.mm-checks{display:flex;flex-direction:column;gap:12px;max-width:760px;margin:32px auto 0}
.mm-check{display:flex;align-items:flex-start;gap:14px;background:#fff;border:1px solid var(--line);
  border-radius:12px;padding:16px 20px;text-align:left}
.mm-check-ico{flex:0 0 24px;width:24px;height:24px;margin-top:1px;border-radius:50%;background:var(--teal);
  display:inline-flex;align-items:center;justify-content:center}
.mm-check-ico svg{width:13px;height:13px;stroke:#fff;fill:none;stroke-width:3;
  stroke-linecap:round;stroke-linejoin:round}
.mm-check-t{font-size:15.5px;font-weight:700;line-height:1.5}
.mm-check-d{display:block;font-size:14px;font-weight:400;color:var(--mut);line-height:1.6;margin-top:3px}

/* Guarantees band */
.mm-guar{background:linear-gradient(180deg,#e8f9ee 0%,#f4fbf6 100%);padding:76px 0 80px;text-align:center}

/* Numbered how-it-works cards */
.mm-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px;margin-top:34px}
.mm-step{background:#fff;border:1px solid var(--line);border-radius:14px;padding:26px 22px;text-align:center;
  box-shadow:0 12px 34px -26px rgba(0,0,0,.4)}
.mm-step-n{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;
  background:var(--teal);color:#fff;font-weight:800;font-size:15px;margin-bottom:14px}
.mm-step-t{display:block;font-weight:800;font-size:16px;margin-bottom:7px}
.mm-step-d{display:block;font-size:14px;color:var(--mut);line-height:1.6}

/* FAQ accordion */
.mm-acc{max-width:820px;margin:32px auto 0;display:flex;flex-direction:column;gap:10px}
.mm-acc-item{border:1px solid var(--line);border-radius:12px;background:#fff;overflow:hidden}
.mm-acc-item summary{list-style:none;cursor:pointer;padding:18px 22px;font-weight:700;font-size:15.5px;
  display:flex;align-items:center;justify-content:space-between;gap:16px}
.mm-acc-item summary::-webkit-details-marker{display:none}
.mm-acc-item summary::after{content:"";flex:0 0 10px;width:10px;height:10px;border-right:2px solid var(--mut);
  border-bottom:2px solid var(--mut);transform:rotate(45deg);transition:transform .2s ease;margin-top:-4px}
.mm-acc-item[open] summary::after{transform:rotate(225deg);margin-top:2px}
.mm-acc-item summary:hover{color:var(--teal)}
.mm-acc-a{padding:0 22px 20px;font-size:14.5px;color:var(--mut);line-height:1.7}

/* Form preview card — opens the questionnaire */
.mm-preview{max-width:440px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:16px;
  padding:20px;box-shadow:0 22px 54px -32px rgba(0,0,0,.5);text-align:left;transition:border-color .15s}
.mm-preview:hover{border-color:rgba(22,163,74,.45)}
.mm-preview-label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mut);margin-bottom:12px}
.mm-preview-dot{width:8px;height:8px;border-radius:50%;background:var(--teal)}
.mm-preview-input{width:100%;border:1px solid var(--line);border-radius:10px;padding:13px 14px;font-size:15px;
  font-family:inherit;color:var(--txt);background:#fff;margin-bottom:12px}
.mm-preview-input:focus{outline:none;border-color:var(--teal)}

/* Repeated CTA under each section */
.mm-cta-center{display:flex;justify-content:center;margin:36px 0 0}
.mm-cta-center-tight{margin-top:22px}

/* Sticky bar — always visible, mirrors the reference funnel */
.mm-sticky-bar{position:fixed;left:0;right:0;bottom:0;z-index:60;background:rgba(255,255,255,.96);
  backdrop-filter:blur(6px);border-top:1px solid var(--line);
  padding:12px 16px;padding-bottom:max(12px,env(safe-area-inset-bottom))}
.mm-sticky-bar .mm-btn{display:block;max-width:420px;margin:0 auto;text-align:center;width:100%}

/* Questionnaire modal */
/* The dialog is portalled onto <body>, i.e. outside .mm-root — so it has to
   carry the palette itself, or every var(--txt)/var(--mut) inside it resolves
   to nothing and the panel renders as pale ghost text. */
.mm-modal{--bg:#ffffff; --bg2:#f4f7f5; --line:rgba(15,30,22,.10);
  --txt:#10231a; --mut:#5b675f; --teal:#16a34a; --red:#ef4444;
  --ease:cubic-bezier(.22,.61,.36,1);
  color:var(--txt);
  font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  line-height:1.6;-webkit-font-smoothing:antialiased;
  position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;
  padding:16px;background:rgba(6,16,11,.62);backdrop-filter:blur(4px)}
.mm-modal-card{position:relative;width:100%;max-width:520px;max-height:min(92dvh,92vh);overflow-y:auto;
  border:1px solid rgba(15,30,22,.12);
  background:#fff;border-radius:18px;box-shadow:0 40px 90px -30px rgba(0,0,0,.6)}
.mm-modal-close{position:absolute;top:12px;right:12px;z-index:2;width:34px;height:34px;border:0;border-radius:9px;
  background:transparent;color:var(--mut);font-size:20px;line-height:1;cursor:pointer}
.mm-modal-close:hover{background:rgba(0,0,0,.05);color:var(--txt)}
.mm-modal-body{padding:26px 24px 24px}
@media (max-width:560px){
  .mm-modal{padding:0;align-items:flex-end}
  .mm-modal-card{max-width:none;border-radius:18px 18px 0 0;max-height:94dvh}
}

/* ---------------------------------------------------------------------------
 * /referral-program and /partner-portal
 * ------------------------------------------------------------------------- */

.mm-topbar-split{display:flex;align-items:center;justify-content:space-between;text-align:left}
.mm-topbar-login{white-space:nowrap}

.mm-refticker{background:var(--teal);color:#fff;overflow:hidden;padding:11px 0}
.mm-refticker-track{display:flex;align-items:center;gap:44px;width:max-content;animation:mm-ticker 34s linear infinite}
.mm-refticker-item{display:inline-flex;align-items:center;gap:9px;font-size:14px;font-weight:700;white-space:nowrap}
.mm-refticker-item::before{content:"";flex:0 0 6px;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.75)}

.mm-refhero{padding:64px 0 68px;text-align:center}
.mm-refhero-eyebrow{display:block;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--mut);margin-bottom:16px}
.mm-refhero-h1{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(34px,6.4vw,72px);line-height:.94;
  text-transform:uppercase;letter-spacing:-.005em;margin-bottom:20px}
.mm-refhero-h1 span{display:block}
.mm-refhero-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:30px 0 44px}

.mm-refstats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;max-width:880px;margin:0 auto}
.mm-refstat{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px 14px;text-align:center}
.mm-refstat-k{display:block;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut)}
.mm-refstat-v{display:block;font-family:'Anton',sans-serif;font-weight:400;font-size:26px;line-height:1;color:var(--teal);margin-top:8px}

/* Tier cards */
.mm-tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:22px;margin-top:40px;align-items:start}
.mm-tier{position:relative;background:#fff;border:1px solid var(--line);border-radius:18px;padding:28px 24px;text-align:left;
  box-shadow:0 18px 46px -34px rgba(0,0,0,.5)}
.mm-tier.is-featured{border-color:rgba(22,163,74,.5);box-shadow:0 24px 58px -28px rgba(22,163,74,.42)}
.mm-tier-flag{position:absolute;top:-13px;left:50%;transform:translateX(-50%);white-space:nowrap;
  background:var(--teal);color:#fff;font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  border-radius:99px;padding:6px 14px}
.mm-tier-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.mm-tier-ico{width:42px;height:42px;border-radius:12px;background:rgba(22,163,74,.1);display:inline-flex;
  align-items:center;justify-content:center}
.mm-tier-ico svg{width:20px;height:20px;fill:var(--teal)}
.mm-tier-code{font-size:11px;letter-spacing:.2em;color:var(--mut)}
.mm-tier-name{font-family:'Anton',sans-serif;font-weight:400;font-size:30px;line-height:1;text-transform:uppercase}
.mm-tier-range{display:block;font-size:14px;font-weight:600;color:var(--teal);margin-top:7px}
.mm-tier-box{background:var(--bg2);border-radius:12px;padding:16px 18px;margin:18px 0 16px}
.mm-tier-box-k{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}
.mm-tier-box-v{display:block;font-size:34px;font-weight:800;line-height:1.1;margin-top:4px}
.mm-tier-box-d{display:block;font-size:13px;color:var(--mut);margin-top:2px}
.mm-tier-blurb{font-size:14px;color:var(--mut);line-height:1.65}
.mm-tier-h{display:block;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);margin:20px 0 10px}
.mm-tier-perks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px}
.mm-tier-perks li{position:relative;padding-left:26px;font-size:14px;line-height:1.55}
.mm-tier-perks li::before{content:"";position:absolute;left:0;top:4px;width:14px;height:8px;
  border-left:2px solid var(--teal);border-bottom:2px solid var(--teal);transform:rotate(-45deg)}
.mm-tier-example{margin-top:4px;background:var(--bg2);border-radius:12px;padding:16px 18px}
.mm-tier-example .mm-tier-h{margin-top:0}
.mm-tier-example ol{margin:0;padding-left:20px}
.mm-tier-example li{font-size:13.5px;color:var(--mut);line-height:1.6;margin-bottom:6px}

/* Dark portal section */
.mm-portal{background:linear-gradient(150deg,#0a1a16 0%,#0d2521 55%,#09140f 100%);color:#e6efea;padding:88px 0}
.mm-portal-grid{display:grid;grid-template-columns:1fr 1fr;gap:52px;align-items:center}
.mm-portal-eyebrow{display:block;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#4ade80;margin-bottom:14px}
.mm-portal-h2{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(30px,4.6vw,52px);line-height:1;
  text-transform:uppercase;margin-bottom:18px}
.mm-portal-lead{font-size:15.5px;line-height:1.7;color:rgba(230,239,234,.66);max-width:520px}
.mm-portal-points{list-style:none;margin:24px 0 30px;padding:0;display:flex;flex-direction:column;gap:12px}
.mm-portal-points li{position:relative;padding-left:28px;font-size:14.5px;color:rgba(230,239,234,.86)}
.mm-portal-points li::before{content:"";position:absolute;left:0;top:5px;width:14px;height:8px;
  border-left:2px solid #4ade80;border-bottom:2px solid #4ade80;transform:rotate(-45deg)}
.mm-portal-cta{display:flex;gap:12px;flex-wrap:wrap}
.mm-btn-dark{background:transparent;color:#e6efea;border:1px solid rgba(230,239,234,.3);box-shadow:none}
.mm-btn-dark:hover{border-color:#4ade80;color:#4ade80;box-shadow:none}

/* Portal preview / dashboard card */
.mm-pcard{background:rgba(9,20,16,.72);border:1px solid rgba(230,239,234,.12);border-radius:18px;padding:22px;
  color:#e6efea;box-shadow:0 30px 70px -40px #000}
.mm-pcard-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.mm-pcard-title{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#4ade80}
.mm-pcard-badge{font-size:11px;font-weight:700;color:#4ade80;background:rgba(74,222,128,.12);border-radius:99px;padding:5px 11px}
.mm-pcard-badge.is-demo{color:rgba(230,239,234,.6);background:rgba(230,239,234,.08)}
.mm-pcard-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.mm-pcard-stats > div{background:rgba(230,239,234,.05);border:1px solid rgba(230,239,234,.08);border-radius:12px;
  padding:16px 10px;text-align:center}
.mm-pcard-v{display:block;font-size:26px;font-weight:800;line-height:1}
.mm-pcard-k{display:block;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:rgba(230,239,234,.5);margin-top:6px}
.mm-pcard-link{display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(230,239,234,.05);
  border:1px solid rgba(230,239,234,.08);border-radius:12px;padding:13px 16px;margin-bottom:14px}
.mm-pcard-link span{font-size:13.5px;color:rgba(230,239,234,.8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mm-pcard-link button{background:none;border:0;color:#4ade80;font:inherit;font-size:11px;font-weight:800;
  letter-spacing:.14em;text-transform:uppercase;cursor:pointer}
.mm-pcard-link button:disabled{color:rgba(230,239,234,.3);cursor:default}
.mm-pcard-progress{background:rgba(230,239,234,.05);border:1px solid rgba(230,239,234,.08);border-radius:12px;padding:16px}
.mm-pcard-progress-head{display:flex;justify-content:space-between;font-size:11px;letter-spacing:.14em;
  text-transform:uppercase;color:rgba(230,239,234,.55);margin-bottom:10px}
.mm-pcard-track{height:7px;border-radius:99px;background:rgba(230,239,234,.12);overflow:hidden}
.mm-pcard-fill{height:100%;border-radius:99px;background:#4ade80;transition:width .5s var(--ease)}
.mm-pcard-note{display:block;font-size:12px;color:rgba(230,239,234,.5);margin-top:10px}

/* Two-column numbered steps */
.mm-steps-2{grid-template-columns:1fr 1fr}
.mm-step-left{text-align:left}
.mm-step-row{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.mm-step-row .mm-step-n{margin-bottom:0}

/* Recurring commission band */
.mm-recurring{background:#fff1f1;padding:76px 0;text-align:center}
.mm-recurring-eyebrow{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:#c81e1e;margin-bottom:14px}
.mm-recurring-h{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(26px,4.4vw,50px);line-height:1.04;
  text-transform:uppercase;margin-bottom:14px}
.mm-recurring-sub{font-size:17px;font-weight:700;max-width:640px;margin:0 auto 12px}
.mm-recurring-note{font-size:14.5px;color:var(--mut);line-height:1.7;max-width:640px;margin:0 auto}

/* Forward band */
.mm-forward{background:var(--teal);color:#fff;padding:80px 0;text-align:center}
.mm-forward .mm-h2{color:#fff}
.mm-forward-sub{font-size:15.5px;line-height:1.7;color:rgba(255,255,255,.86);max-width:620px;margin:0 auto 28px}
.mm-forward-sub a{color:#fff}
.mm-forward-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.mm-btn-white{background:#fff;color:var(--teal);border-color:#fff}
.mm-btn-white:hover{box-shadow:0 14px 40px rgba(0,0,0,.22)}
.mm-btn-outline-white{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.7);box-shadow:none}
.mm-btn-outline-white:hover{background:rgba(255,255,255,.12);box-shadow:none}

/* Accordion numbering */
.mm-acc-n{display:inline-block;min-width:26px;font-size:12px;font-weight:800;color:var(--teal);letter-spacing:.1em}

/* Sticky bar with two buttons */
.mm-sticky-bar-2{display:flex;gap:10px;justify-content:center}
.mm-sticky-bar-2 .mm-btn{flex:1 1 0;max-width:240px;text-align:center}

/* Portal auth + dashboard */
.mm-authcard{max-width:460px;margin:0 auto;background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px 24px;
  box-shadow:0 20px 54px -34px rgba(0,0,0,.45)}
.mm-authtabs{display:flex;gap:6px;background:var(--bg2);border-radius:12px;padding:5px;margin-bottom:20px}
.mm-authtabs button{flex:1;border:0;background:none;font:inherit;font-size:14px;font-weight:700;color:var(--mut);
  padding:10px;border-radius:9px;cursor:pointer;transition:background .15s,color .15s}
.mm-authtabs button.is-on{background:#fff;color:var(--txt);box-shadow:0 2px 8px rgba(0,0,0,.07)}
.mm-form-note{font-size:13px;color:var(--teal);text-align:center;margin-top:4px}

.mm-dash{max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:22px}
.mm-dash-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
.mm-dash-hello{display:block;font-size:13px;color:var(--mut)}
.mm-dash-tier{font-family:'Anton',sans-serif;font-weight:400;font-size:32px;line-height:1;text-transform:uppercase;margin-top:6px}
.mm-dash-block{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px 24px}
.mm-dash-h3{font-size:17px;font-weight:800;margin-bottom:14px}
.mm-dash-row{display:grid;grid-template-columns:1.4fr 1fr auto;gap:10px}
.mm-dash-table{width:100%;border-collapse:collapse;font-size:14px}
.mm-dash-table th{text-align:left;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);
  padding:0 10px 10px 0;border-bottom:1px solid var(--line)}
.mm-dash-table td{padding:12px 10px 12px 0;border-bottom:1px solid var(--line)}
.mm-pill{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;
  border-radius:99px;padding:4px 10px}
.mm-pill-pending{background:rgba(234,179,8,.14);color:#a16207}
.mm-pill-confirmed{background:rgba(22,163,74,.12);color:var(--teal)}
.mm-pill-rejected{background:rgba(239,68,68,.12);color:#b91c1c}

@media (max-width:900px){
  .mm-portal-grid{grid-template-columns:1fr;gap:36px}
  .mm-steps-2{grid-template-columns:1fr}
}
@media (max-width:560px){
  .mm-dash-row{grid-template-columns:1fr}
  .mm-refhero{padding:44px 0 50px}
}
  box-shadow:0 16px 44px -32px rgba(0,0,0,.5)}
.mm-tier.is-featured{border-color:rgba(22,163,74,.5);box-shadow:0 22px 56px -28px rgba(22,163,74,.45)}
.mm-tier-badge{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  color:var(--teal);background:rgba(22,163,74,.1);border-radius:99px;padding:5px 11px;margin-bottom:16px}
.mm-tier-code{display:block;font-size:11px;letter-spacing:.18em;color:var(--mut);margin-bottom:4px}
.mm-tier-name{font-family:'Anton',sans-serif;font-weight:400;font-size:30px;line-height:1;text-transform:uppercase}
.mm-tier-range{display:block;font-size:13px;color:var(--mut);margin-top:6px}
.mm-tier-commission{display:block;font-family:'Anton',sans-serif;font-weight:400;font-size:42px;line-height:1;
  color:var(--teal);margin:16px 0 4px}
.mm-tier-commission small{display:block;font-family:inherit;font-size:12px;font-weight:600;color:var(--mut);
  letter-spacing:.06em;text-transform:uppercase;margin-top:5px}
.mm-tier-blurb{font-size:14px;color:var(--mut);line-height:1.65;margin-top:14px}
.mm-tier-perks{list-style:none;margin:18px 0 0;padding:0;display:flex;flex-direction:column;gap:9px}
.mm-tier-perks li{position:relative;padding-left:24px;font-size:14px;line-height:1.55}
.mm-tier-perks li::before{content:"";position:absolute;left:0;top:5px;width:14px;height:8px;
  border-left:2px solid var(--teal);border-bottom:2px solid var(--teal);transform:rotate(-45deg)}
.mm-tier-example{margin-top:20px;border-top:1px solid var(--line);padding-top:16px}
.mm-tier-example-h{display:block;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  color:var(--mut);margin-bottom:10px}
.mm-tier-example ol{margin:0;padding-left:18px}
.mm-tier-example li{font-size:13.5px;color:var(--mut);line-height:1.6;margin-bottom:5px}

/* ---------------------------------------------------------------------------
 * QUESTIONNAIRE FLOW (components/ApplyFlow.tsx) and /google-funnel
 * ------------------------------------------------------------------------- */

.mm-qflow{display:block}
.mm-qflow-head{display:flex;justify-content:space-between;font-size:11px;font-weight:700;
  letter-spacing:.14em;text-transform:uppercase;color:var(--mut);margin-bottom:8px}
.mm-qflow-track{height:6px;border-radius:99px;background:rgba(15,30,22,.08);overflow:hidden;margin-bottom:22px}
.mm-qflow-fill{height:100%;border-radius:99px;background:var(--teal);transition:width .35s var(--ease)}
.mm-qflow-body{display:flex;flex-direction:column;text-align:left}
.mm-qflow-kicker{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:var(--teal);margin-bottom:8px}
.mm-qflow-question{font-size:19px;font-weight:800;line-height:1.35;margin-bottom:8px}
.mm-qflow-desc{font-size:14px;color:var(--mut);line-height:1.65;margin-bottom:16px}
.mm-qflow-opts{display:flex;flex-direction:column;gap:10px}
.mm-choice{width:100%;text-align:left;border:1px solid var(--line);border-radius:12px;background:#fff;
  padding:15px 16px;font:inherit;font-size:14.5px;font-weight:600;color:var(--txt);cursor:pointer;
  transition:border-color .15s,background .15s,transform .1s}
.mm-choice:hover{border-color:var(--teal);background:rgba(22,163,74,.04)}
.mm-choice:active{transform:scale(.995)}
.mm-qflow-rows{display:flex;flex-direction:column;gap:1px;background:var(--line);border:1px solid var(--line);
  border-radius:12px;overflow:hidden;margin-bottom:16px}
.mm-qflow-row{display:flex;justify-content:space-between;gap:14px;background:#fff;padding:12px 15px}
.mm-qflow-row dt{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}
.mm-qflow-row dd{font-size:13.5px;font-weight:700;text-align:right;word-break:break-word}
.mm-qflow-bullets{list-style:none;margin:0 0 16px;padding:0;display:flex;flex-direction:column;gap:10px}
.mm-qflow-bullets li{position:relative;padding-left:26px;font-size:14.5px;line-height:1.55}
.mm-qflow-bullets li::before{content:"";position:absolute;left:0;top:5px;width:13px;height:7px;
  border-left:2px solid var(--teal);border-bottom:2px solid var(--teal);transform:rotate(-45deg)}
.mm-qflow-bullets.is-contract li{background:var(--bg2);border-radius:10px;padding:12px 14px 12px 34px}
.mm-qflow-bullets.is-contract li::before{left:14px;top:17px}
.mm-qflow-note{font-size:12.5px;color:var(--mut);line-height:1.6;margin-bottom:16px}
.mm-qflow-back{align-self:flex-start;margin-top:14px;background:none;border:0;padding:0;font:inherit;
  font-size:13px;color:var(--mut);cursor:pointer}
.mm-qflow-back:hover{color:var(--teal)}
.mm-opt-label{font-weight:400;color:var(--mut)}
.mm-field-hint{font-size:12.5px;color:var(--mut);line-height:1.5}
.mm-form-no-ico{background:var(--mut)}
.mm-form-no{border-color:var(--line)}

/* Google Ads lander — as plain as it looks on purpose. */
.mm-gf{background:#fff;min-height:100vh;display:flex;flex-direction:column}
.mm-gf-risk{background:var(--bg2);border-bottom:1px solid var(--line);margin:0;padding:12px 24px;
  font-size:11.5px;line-height:1.6;color:var(--mut);text-align:center}
.mm-gf-main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:96px 24px 110px}
.mm-gf-h1{font-family:'Inter',system-ui,sans-serif;font-weight:800;font-size:clamp(30px,5vw,52px);
  line-height:1.12;letter-spacing:-.02em;max-width:760px;margin-bottom:14px}
.mm-gf-sub{font-size:16px;color:var(--mut);margin-bottom:34px}
.mm-gf-cta{min-width:min(420px,90vw);letter-spacing:.06em}

/* ---------------------------------------------------------------------------
 * TRACK RECORD panel (components/TrackRecord.tsx)
 * ------------------------------------------------------------------------- */

.mm-tr{text-align:left}
.mm-tr-head{display:grid;grid-template-columns:1.2fr .8fr;gap:26px;align-items:center;
  background:linear-gradient(160deg,#f4f8f5 0%,#eef4f0 100%);border:1px solid var(--line);
  border-radius:18px;padding:24px}
.mm-tr-ident{display:flex;flex-direction:column;gap:16px}
.mm-tr-logo{display:inline-flex;align-items:center;justify-content:center;width:88px;height:74px;
  background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 8px 22px -16px rgba(0,0,0,.4)}
.mm-tr-logo img{max-width:64px;max-height:52px}
.mm-tr-pills{display:flex;flex-wrap:wrap;gap:8px}
.mm-tr-pill{border:1px solid var(--line);border-radius:99px;background:#fff;color:var(--mut);
  font:inherit;font-size:13px;font-weight:600;padding:8px 15px;cursor:pointer;
  transition:border-color .15s,color .15s,background .15s}
button.mm-tr-pill:hover{border-color:var(--teal);color:var(--teal)}
.mm-tr-pill.is-on{border-color:var(--teal);color:var(--teal);background:rgba(22,163,74,.09);font-weight:700}
.mm-tr-pill.is-tag{background:#6d43c9;border-color:#6d43c9;color:#fff;cursor:default}
.mm-tr-pill.is-muted{background:rgba(15,30,22,.05);border-color:transparent;cursor:default}
.mm-tr-headline{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.mm-tr-box{background:rgba(255,255,255,.7);border:1px solid var(--line);border-radius:14px;
  padding:18px 16px;text-align:center}
.mm-tr-box.is-primary{background:#fff;box-shadow:0 14px 34px -24px rgba(0,0,0,.45)}
.mm-tr-box-k{display:block;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut)}
.mm-tr-box-v{display:block;font-size:clamp(22px,3vw,30px);font-weight:800;line-height:1.1;margin-top:6px}
.mm-tr-box-sub{display:block;font-size:12px;color:var(--mut);margin-top:3px}

.mm-tr-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:14px}
.mm-tr-stat{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px}
.mm-tr-stat-k{display:block;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut)}
.mm-tr-stat-v{display:block;font-size:26px;font-weight:800;line-height:1.1;margin-top:7px}

.mm-tr-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px}
.mm-tr-panel{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px}
.mm-tr-panel.is-wide{grid-column:1 / -1}
.mm-tr-panel-t{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;
  color:var(--mut);margin-bottom:14px}

.mm-tr-chart svg{width:100%;height:auto;display:block;overflow:visible}

.mm-tr-months{display:flex;align-items:flex-end;gap:10px;height:180px}
.mm-tr-month{flex:1;display:flex;flex-direction:column;align-items:center;height:100%}
.mm-tr-month-v{font-size:11px;font-weight:700;margin-bottom:6px}
.mm-tr-month-track{flex:1;width:100%;display:flex;align-items:flex-end}
.mm-tr-month-fill{width:100%;border-radius:6px 6px 0 0;background:var(--teal);min-height:3px}
.mm-tr-month-fill.is-neg{background:var(--red)}
.mm-tr-month-k{font-size:11px;color:var(--mut);margin-top:7px}

.mm-tr-dist{display:flex;flex-direction:column;gap:11px}
.mm-tr-dist-row{display:grid;grid-template-columns:74px 1fr auto;gap:12px;align-items:center}
.mm-tr-dist-k{font-size:12.5px;font-weight:600}
.mm-tr-dist-track{height:9px;border-radius:99px;background:rgba(15,30,22,.07);overflow:hidden}
.mm-tr-dist-fill{display:block;height:100%;border-radius:99px;background:var(--teal)}
.mm-tr-dist-v{font-size:12px;color:var(--mut);white-space:nowrap}

.mm-tr-defs{display:flex;flex-direction:column;gap:1px;background:var(--line);border-radius:10px;overflow:hidden}
.mm-tr-def{display:flex;justify-content:space-between;gap:12px;background:#fff;padding:11px 13px}
.mm-tr-def dt{font-size:12.5px;color:var(--mut)}
.mm-tr-def dd{font-size:13px;font-weight:700}

.mm-tr-note{font-size:12px;color:var(--mut);line-height:1.7;margin-top:18px}

@media (max-width:820px){
  .mm-tr-head{grid-template-columns:1fr}
  .mm-tr-grid{grid-template-columns:1fr}
}

/* The window is wider than the questionnaire's. */
.mm-modal-wide{max-width:940px}

/* ---------------------------------------------------------------------------
 * SUBPAGES — /payouts, /past-performance, /reviews, /contract
 * Same shell as the money page minus the ticker and the sticky CTA, so the
 * top/bottom padding those reserve has to come back off.
 * ------------------------------------------------------------------------- */
.mm-root-sub{padding-top:0;padding-bottom:0}
/* Pages that keep a sticky bar have to reserve room, or it sits on the footer. */
.mm-root-sticky{padding-bottom:calc(78px + env(safe-area-inset-bottom))}
.mm-sub-hero{background:var(--bg2);border-bottom:1px solid var(--line);padding:72px 0 60px;text-align:center}
.mm-sub-hero .mm-lead{margin:0 auto}
.mm-sub-back{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:var(--mut);
  text-decoration:none;margin-bottom:20px;transition:color .15s}
.mm-sub-back:hover{color:var(--teal)}
.mm-sub-h1{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(38px,6.4vw,74px);line-height:.94;
  letter-spacing:-.01em;text-transform:uppercase;margin-bottom:18px}
.mm-sub-cta{padding:76px 0 84px;text-align:center;background:var(--bg2);border-top:1px solid var(--line)}
.mm-sub-cta h2{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(26px,4vw,44px);
  line-height:1.02;text-transform:uppercase;margin-bottom:14px}
.mm-sub-cta p{font-size:15px;color:var(--mut);max-width:520px;margin:0 auto 26px}
.mm-cert-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px;margin-top:40px}
.mm-cert-grid .mm-certcard{width:100%;min-width:0}
.mm-rev-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;margin-top:38px}
.mm-rev-grid .mm-rev-card{flex:1 1 auto;width:100%;min-width:0}
.mm-doc{max-width:760px;margin:0 auto}
.mm-doc h3{font-size:19px;font-weight:800;margin:38px 0 10px;letter-spacing:-.01em}
.mm-doc h3:first-child{margin-top:0}
.mm-doc p{font-size:15.5px;color:var(--mut);line-height:1.75;margin-bottom:12px}
.mm-doc ul{margin:0 0 14px 20px;padding:0}
.mm-doc li{font-size:15.5px;color:var(--mut);line-height:1.75;margin-bottom:7px}
.mm-doc strong{color:var(--txt);font-weight:700}
@media (max-width:640px){
  .mm-sub-hero{padding:52px 0 44px}
  .mm-cert-grid,.mm-rev-grid{grid-template-columns:1fr}
}
`
