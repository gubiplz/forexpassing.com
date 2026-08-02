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
  TELEGRAM_HREF,
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

export const FOOTER_LINKS: [string, string][] = [
  ['Client Payouts', '/payouts'],
  ['Past Performance', '/past-performance'],
  ['Reviews', '/reviews'],
  ['Contract', '/contract'],
  ['About Us', '/about-us'],
]

const FOOTER_LEGAL: [string, string][] = [
  ['Terms of Service', '/terms'],
  ['Privacy Policy', '/privacy'],
]

export function SiteFooter() {
  return (
    <footer className="mm-footer">
      <div className="mm-wrap mm-footer-center">
        <a href="/meta" className="mm-footer-logo" aria-label="Forex Passing — home">
          <img className="mm-logo-img mm-logo-img-sm" src="/logo-light.svg" alt="Forex Passing" />
        </a>

        <nav className="mm-footer-nav" aria-label="Footer">
          {FOOTER_LINKS.map(([label, href]) => (
            <a href={href} key={href}>{label}</a>
          ))}
        </nav>

        <nav className="mm-footer-sub" aria-label="Legal and contact">
          {FOOTER_LEGAL.map(([label, href]) => (
            <a href={href} key={href}>{label}</a>
          ))}
          <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
          <a href={TELEGRAM_HREF} target="_blank" rel="noopener noreferrer">Telegram</a>
        </nav>

        <p className="mm-footer-risk">
          Trading disclaimer: prop firm evaluations, foreign exchange and CFDs carry a substantial
          risk of loss and are not suitable for everyone. An evaluation can fail, an account can be
          breached, and no result is guaranteed. Past performance does not indicate future results.
          Nothing on this site is financial, investment or trading advice.
        </p>
        <p className="mm-footer-risk">
          Forex Passing is an independent account management service. It is not affiliated with,
          endorsed by or sponsored by Meta Platforms, Inc. or Google LLC. Prop firm names and marks
          belong to their respective owners.
        </p>
        <span className="mm-footer-copy">© {new Date().getFullYear()} Forex Passing · forexpassing.com</span>
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
      el.addEventListener('pointerdown', onDown)
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
.mm-flow{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:30px 0 22px}
@media(max-width:760px){.mm-flow{grid-template-columns:1fr 1fr}}
.mm-flow-step{border:1px solid var(--line);border-radius:12px;padding:16px 14px;background:rgba(0,0,0,.02)}
.mm-flow-n{font-family:'Anton',sans-serif;font-size:18px;color:var(--teal)}
.mm-flow-t{display:block;font-weight:700;font-size:14px;margin-top:4px}
.mm-flow-d{display:block;font-size:12px;color:var(--mut);margin-top:3px}
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
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.mm-scroller:active{cursor:grabbing}
.mm-scroller-lock{cursor:default}
.mm-scroller::-webkit-scrollbar{display:none}
.mm-scroller-track{display:flex;width:max-content}
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
.mm-progress{display:grid;gap:8px}
.mm-progress-bar{height:6px;border-radius:999px;background:rgba(15,30,22,.08);overflow:hidden}
.mm-progress-fill{height:100%;border-radius:999px;background:var(--teal);transition:width .3s var(--ease)}
.mm-progress-label{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}
.mm-qstep{display:grid;gap:14px}
.mm-q{font-family:'Anton',sans-serif;font-weight:400;font-size:clamp(21px,3.4vw,27px);line-height:1.15;
  text-transform:uppercase;letter-spacing:.01em}
.mm-q-help{font-size:14px;color:var(--mut);margin-top:-8px}
.mm-choices{display:grid;gap:10px}
.mm-choice{display:block;width:100%;text-align:left;font-family:inherit;font-size:15px;font-weight:600;color:var(--txt);
  background:#fff;border:1px solid var(--line);border-radius:10px;padding:14px 16px;cursor:pointer;
  transition:border-color .15s,background .15s,transform .15s var(--ease)}
.mm-choice:hover{border-color:var(--teal);background:rgba(22,163,74,.05);transform:translateY(-1px)}
.mm-choice.is-on{border-color:var(--teal);background:rgba(22,163,74,.08)}
.mm-choice-wide{text-align:center}
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

/* FOOTER — dark band: logo, one row of real subpages, then the disclaimers */
.mm-footer{background:#0c1411;padding:56px 0 44px}
.mm-footer-center{display:flex;flex-direction:column;align-items:center;text-align:center;gap:18px}
.mm-footer-logo{display:inline-block}
.mm-footer-nav{display:flex;gap:26px;flex-wrap:wrap;justify-content:center}
.mm-footer-nav a{color:rgba(230,239,234,.64);text-decoration:none;font-size:14px;transition:color .15s}
.mm-footer-nav a:hover{color:#4ade80}
.mm-footer-sub{display:flex;gap:18px;flex-wrap:wrap;justify-content:center;margin-top:-6px}
.mm-footer-sub a{color:rgba(230,239,234,.42);text-decoration:none;font-size:12.5px;transition:color .15s}
.mm-footer-sub a:hover{color:#4ade80}
.mm-footer-risk{font-size:11.5px;color:rgba(230,239,234,.44);line-height:1.7;max-width:780px}
.mm-footer-copy{font-size:12px;color:rgba(230,239,234,.32)}
.mm-logo-sm{font-size:16px}
.mm-footer-copy{font-size:12px;color:var(--mut)}
.mm-footer-risk{font-size:12px;color:var(--mut);line-height:1.6;max-width:720px}
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
.mm-letter{background:var(--bg);border-top:1px solid var(--line)}
.mm-letter-body{max-width:680px;margin:0 auto;font-size:clamp(16px,2vw,18px);line-height:1.75;color:var(--txt)}
.mm-letter-body p{margin-bottom:1.1em}
.mm-letter-body p.mm-letter-lead{font-size:clamp(20px,2.6vw,26px);font-weight:800;color:var(--txt)}
.mm-letter-body p.mm-letter-punch{font-weight:800;font-size:clamp(17px,2.2vw,20px);color:var(--txt)}
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
 * SUBPAGES — /payouts, /past-performance, /reviews, /contract
 * Same shell as the money page minus the ticker and the sticky CTA, so the
 * top/bottom padding those reserve has to come back off.
 * ------------------------------------------------------------------------- */
.mm-root-sub{padding-top:0;padding-bottom:0}
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
