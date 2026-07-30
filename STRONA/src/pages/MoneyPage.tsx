// ⚠ CASE STUDY — "money" page. Cloaking gate (App.tsx) renders this only for
// visitors classified `human`. Aggressive direct-response landing: fixed ticker,
// AI Risk Officer verdict mock, value-stack offer, urgency countdown, fake
// "verified" payouts + reviews, myfxbook-style track record.
// Conference demo of how scammers craft a funded-trader funnel. Never deployed.

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { CHECKOUT_HREF } from '../constants'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

// Conversion tracking. Fires Meta Pixel + GA4. IDs live in index.html.
// TODO(launch): swap placeholder GA4 (G-MM2026XXXX) + Pixel (000000000000000) for real IDs.
function track(fbEvent: string, gaEvent: string, params?: Record<string, unknown>, custom = false) {
  if (typeof window === 'undefined') return
  if (custom) window.fbq?.('trackCustom', fbEvent, params)
  else window.fbq?.('track', fbEvent, params)
  window.gtag?.('event', gaEvent, params)
}

const PAYOUTS = [
  { src: '/payouts/ftmo-zenomtrader.png', firm: 'FTMO', name: 'ZenomTrader', amount: '$11,774.04' },
  { src: '/payouts/maven-arun.png', firm: 'Maven Trading Group', name: 'Arun', amount: '$6,530' },
  { src: '/payouts/ftmo-andzz.png', firm: 'FTMO', name: 'Andzz', amount: '$5,246.32' },
  { src: '/payouts/topone-robert.png', firm: 'TopOne Trader', name: 'Robert Lea-Kime', amount: '$4,568.80' },
  { src: '/payouts/fxify-bhavesh.png', firm: 'FXIFY', name: 'bhavesh Sonawane', amount: '$1,780.00' },
  { src: '/payouts/maven-maximilian.png', firm: 'Maven Trading Group', name: 'Maximilian L.', amount: '$1,028' },
]

const PAIN_STEPS = [
  'You buy the challenge',
  'You start clean',
  'You take one loss',
  'Revenge mode',
  'One more click',
  'Random stop',
  'Daily loss blown',
  'Reset. Again.',
]

// AI Risk Officer verdict checks (hero dashboard mock).
const CHECKS = [
  { ok: true, t: 'HTF context aligned' },
  { ok: true, t: 'Structure: valid break + retest' },
  { ok: false, t: 'Risk:Reward 0.8 — below 1.5 min' },
  { ok: false, t: 'Daily-loss buffer: 18% left' },
  { ok: false, t: 'Emotional flag: 2 losses in a row' },
]

// Mechanism — the 4-step pre-trade flow.
const FLOW: [string, string, string][] = [
  ['01', 'Setup detected', 'NQ · 15m · Long'],
  ['02', 'HTF context', 'Trend + key levels checked'],
  ['03', 'Risk + emotion', 'R:R, daily buffer, tilt flags'],
  ['04', 'Verdict', 'Trade / Wait / No Trade'],
]

// The offer, reframed as a system — value stack ($450 → $49).
const SYSTEM: { tag?: string; t: string; d: string; v: string }[] = [
  { tag: 'CORE', t: 'The AI Risk Officer System', d: 'The full pre-trade process — setup, context, risk and emotional check before your hand touches the mouse.', v: '$149' },
  { t: 'The Prompt Pack', d: 'Copy-paste Claude prompts that turn your chart into one verdict: Trade / Wait / No Trade.', v: '$79' },
  { t: 'The Challenge Kill-Switch', d: 'Daily-loss and tilt guardrails that stop the revenge sequence before it starts.', v: '$69' },
  { t: 'Failed-Challenge Autopsy', d: 'A framework to find the exact habit that keeps blowing your accounts — and kill it.', v: '$59' },
  { t: 'Payout-Ready Routine', d: 'The daily operator routine that keeps you inside the rules all the way to the payout.', v: '$49' },
  { t: '7-Day Challenge Prep Plan', d: 'A day-by-day plan to walk into your next challenge with the process already locked in.', v: '$45' },
]

const WHOFOR: [string, string][] = [
  ['Challenge resetters', "You've bought more challenges than you'd like to admit. The skill is there — the brake isn't."],
  ['Revenge traders', 'One loss and your hand is already back on the mouse. You need something between the emotion and the click.'],
  ['Funded but fragile', 'You passed — now one bad day threatens the account. You want a routine that protects the payout.'],
]

const FAQ = [
  { q: 'Is this signals or a bot?', a: "No. That's the point. It's the brake between you and the click. You make the call; the system makes sure it's a good one before your hand moves." },
  { q: 'Do I need to code?', a: 'No. Claude and Codex build the tools; you stay the operator. If you can copy and paste, you can run this.' },
  { q: 'Will this get me funded?', a: "It won't trade for you. It removes the reason most traders fail a challenge: clicking when they shouldn't. The rest is you following the process." },
  { q: 'Which markets is this for?', a: 'Built for US futures traders (NQ, ES, MNQ and the rest) running prop-firm challenges like Topstep and Apex. The process works on any liquid market.' },
  { q: 'What exactly do I get?', a: 'The full six-part system: the AI Risk Officer process, the Prompt Pack, the Challenge Kill-Switch, the Failed-Challenge Autopsy, the Payout-Ready Routine and the 7-Day Prep Plan.' },
  { q: 'How do I get access?', a: 'Instantly. The second your Stripe payment clears, the full system lands in your inbox. Nothing to wait for, nothing to ship.' },
  { q: 'Am I covered if it’s not for me?', a: '14-day refund, no interrogation. Run the process, and if it doesn’t change how you trade, email us inside two weeks and we refund you.' },
  { q: 'I’m still early. Is this too advanced?', a: 'No. If you can read a chart well enough to take a setup, you can run this. It doesn’t teach you to trade. It stops you taking the trades that blow your account.' },
  { q: 'Why is it only $49?', a: 'Founder price to get operators in and collect results. It’s built to feel like a no-brainer against one blown challenge, which costs you far more than $49.' },
]

const REVIEWS = [
  { name: 'Mike R.', text: 'Passed my Topstep combine on the second try after I stopped overtrading NQ. The verdict step is what saved me — half my "setups" were No Trade.', ago: '4 days ago' },
  { name: 'Sarah L.', text: 'Funded on Apex now. ES used to chop me up at the open; the pre-trade check keeps me out of the first 15 minutes of nonsense.', ago: '1 week ago' },
  { name: 'Carlos D.', text: 'The Kill-Switch is the whole thing for me. Two reds and it tells me to stand down — exactly when I used to revenge trade NQ.', ago: '1 week ago' },
  { name: 'Dave K.', text: 'First payout cleared last month. I treat risk like an operator now instead of gambling size after a loss.', ago: '2 weeks ago' },
  { name: 'Priya M.', text: 'Three months on the routine, zero blown accounts. ES, no random stops, no tilt. That was never me before this.', ago: '2 weeks ago' },
  { name: 'James T.', text: 'Was skeptical about an "AI risk officer". Turns out it just stops me clicking when the R:R is garbage. Worth every cent.', ago: '3 days ago' },
  { name: 'Elena V.', text: 'Trading MNQ while I build size. The 7-day prep plan got me into my last challenge calm for once.', ago: '5 days ago' },
  { name: 'Tom W.', text: 'The Prompt Pack alone is worth it. Drop in my NQ chart, get Trade / Wait / No Trade, done. No more staring and forcing it.', ago: '6 days ago' },
]

// Cumulative growth (%) per ~weekly point, Jan→Jun 2026. Ends ~+60%.
const EQUITY = [
  0, 1.2, 2.6, 2.1, 4.0, 5.8, 5.0, 6.4, 7.9, 9.1, 8.3, 10.6, 12.9, 14.4,
  16.0, 19.2, 22.5, 25.4, 27.0, 30.1, 34.5, 39.8, 44.2, 47.8, 54.0, 60.2,
]

const MONTHLY = [
  { m: 'Jan', v: 5.8, c: '#a589c9' },
  { m: 'Feb', v: 3.1, c: '#e0807e' },
  { m: 'Mar', v: 4.9, c: '#54b4ab' },
  { m: 'Apr', v: 10.98, c: '#f0a869' },
  { m: 'May', v: 16.38, c: '#a9c56d' },
  { m: 'Jun', v: 8.4, c: '#e6c75f' },
]

const STATS: [string, string][] = [
  ['Gain', '+60.2%'], ['Abs. Gain', '+60.2%'], ['Daily', '0.27%'], ['Monthly', '8.15%'],
  ['Drawdown', '7.41%'], ['Balance', '$160,210'], ['Profit Factor', '2.14'], ['Win Rate', '68%'],
]

const TRADES = [
  { sym: 'NQ', act: 'Long', qty: '3', pts: '+128.5', profit: '+$7,710', up: true },
  { sym: 'ES', act: 'Short', qty: '4', pts: '+22.25', profit: '+$4,450', up: true },
  { sym: 'MNQ', act: 'Long', qty: '10', pts: '+96.0', profit: '+$1,920', up: true },
  { sym: 'CL', act: 'Long', qty: '2', pts: '+1.18', profit: '+$2,360', up: true },
  { sym: 'GC', act: 'Short', qty: '1', pts: '-9.40', profit: '-$940', up: false },
  { sym: 'RTY', act: 'Long', qty: '3', pts: '+14.6', profit: '+$2,190', up: true },
  { sym: 'YM', act: 'Long', qty: '2', pts: '+186', profit: '+$1,860', up: true },
  { sym: 'NQ', act: 'Short', qty: '2', pts: '+74.0', profit: '+$2,960', up: true },
]

const TICKER = [
  'Verified payouts',
  'No signals · No bots',
  'Trade · Wait · No Trade',
  'Built for funded traders',
  'Stop revenge trading',
  'Prop-firm ready',
  '500+ traders inside',
]

function TopTicker() {
  const items = [...TICKER, ...TICKER]
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y > 140 && y > last) setHidden(true)
      else if (y < last || y < 80) setHidden(false)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const check = (
    <span className="mm-ticker-ico" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="#fff" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  )
  return (
    <div className={`mm-ticker${hidden ? ' mm-ticker-hidden' : ''}`} aria-label="Announcements">
      <div className="mm-ticker-track">
        {items.map((t, i) => (
          <span className="mm-ticker-item" key={t + i}>{check}{t}</span>
        ))}
      </div>
    </div>
  )
}

function TopBar() {
  return (
    <div className="mm-topbar">
      <a href="#top" className="mm-logo"><img className="mm-logo-img" src="/logo.svg" alt="Forex Passing" /></a>
    </div>
  )
}

// AI Risk Officer dashboard mock — the hero proof element.
function VerdictCard() {
  return (
    <div className="mm-vcard" role="img" aria-label="AI Risk Officer verdict: No Trade">
      <div className="mm-vcard-head">
        <span className="mm-vcard-title">AI RISK OFFICER</span>
        <span className="mm-vcard-live"><span className="mm-vcard-dot" />LIVE</span>
      </div>
      <div className="mm-vcard-setup">NQ · 15m · Long · NY open</div>
      <div className="mm-vcard-checks">
        {CHECKS.map((c) => (
          <div className={`mm-vcheck ${c.ok ? 'mm-vcheck-ok' : 'mm-vcheck-bad'}`} key={c.t}>
            <span className="mm-vcheck-ico">{c.ok ? '✓' : '✕'}</span>
            <span>{c.t}</span>
          </div>
        ))}
      </div>
      <div className="mm-vcard-verdict">NO TRADE</div>
      <div className="mm-vcard-foot">The trade your old self would've taken.</div>
    </div>
  )
}

function endOfTodayMs() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.getTime()
}

// Fake urgency countdown to "end of founder price" (resets daily).
function Countdown() {
  const target = useRef(endOfTodayMs())
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  let s = Math.max(0, Math.floor((target.current - now) / 1000))
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  s %= 3600
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return <span className="mm-count">{h}:{m}:{sec}</span>
}

// Interactive equity curve — hover to inspect balance/growth at each point.
function EquityCurve() {
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
function AutoScroller({
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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let acc = reverse ? el.scrollWidth / 2 : 0
    el.scrollLeft = acc
    let resumeAt = 0
    const bump = () => { resumeAt = performance.now() + 1800 }

    let down = false
    let startX = 0
    let startScroll = 0
    const onDown = (e: PointerEvent) => {
      bump()
      if (e.pointerType !== 'mouse') return
      down = true
      startX = e.clientX
      startScroll = el.scrollLeft
      el.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      el.scrollLeft = startScroll - (e.clientX - startX)
      acc = el.scrollLeft
    }
    const onUp = () => { down = false; bump() }

    const frame = (now: number) => {
      const half = el.scrollWidth / 2
      if (half > 0) {
        if (now >= resumeAt && !down) {
          acc += reverse ? -speed : speed
          if (acc >= half) acc -= half
          else if (acc < 0) acc += half
          el.scrollLeft = acc
        } else {
          acc = el.scrollLeft
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    // lock = auto-scroll only, no manual drag/swipe (overflow hidden in CSS).
    if (!lock) {
      el.addEventListener('pointerdown', onDown)
      el.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      el.addEventListener('touchstart', bump, { passive: true })
      el.addEventListener('wheel', bump, { passive: true })
    }
    return () => {
      if (raf) cancelAnimationFrame(raf)
      if (!lock) {
        el.removeEventListener('pointerdown', onDown)
        el.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        el.removeEventListener('touchstart', bump)
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

export function MoneyPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const cards = [...PAYOUTS, ...PAYOUTS]
  const reviewRows = [
    [...REVIEWS, ...REVIEWS],
    [...[...REVIEWS].reverse(), ...[...REVIEWS].reverse()],
  ]
  const monthlyTop = Math.max(...MONTHLY.map((x) => x.v))

  // Scroll-reveal — fade/slide sections in once as they enter the viewport.
  // Fails open: no IO support or reduced-motion → everything shown immediately.
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
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    track('ViewContent', 'view_content', { content_name: 'AI Risk Officer System', value: 49, currency: 'USD' })
    const fired = new Set<number>()
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (max <= 0) return
      const pct = Math.round((window.scrollY / max) * 100)
      for (const t of [25, 50, 75, 100]) {
        if (pct >= t && !fired.has(t)) {
          fired.add(t)
          track('ScrollDepth', 'scroll_depth', { percent: t }, true)
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="mm-root" ref={rootRef}>
      <style>{CSS}</style>

      <TopTicker />
      <TopBar />

      {/* HERO — message-matched to the ad: "Stop Blowing Funded Challenges" */}
      <section className="mm-hero" id="top">
        <div className="mm-wrap mm-hero-grid">
          <div className="mm-hero-copy">
            <span className="mm-eyebrow mm-eyebrow-teal">The AI Risk Officer System · For funded traders</span>
            <h1 className="mm-h1">STOP BLOWING<br />FUNDED CHALLENGES.</h1>
            <p className="mm-lead">
              One loss turns you into a different trader — and the funded account pays for it.
              <strong> Let AI check the trade before your emotions touch the mouse.</strong>
            </p>
            <ul className="mm-hero-points">
              <li>AI checks the setup <strong>before</strong> your hand touches the mouse</li>
              <li>Every trade gets one verdict: <strong>Trade / Wait / No Trade</strong></li>
              <li>The brake that kills the revenge sequence — no signals, no bot</li>
            </ul>
            <div className="mm-cta-row mm-cta-left">
              <a href="#price" className="mm-btn mm-btn-lg" onClick={() => track('CTAClick', 'cta_click', { source: 'hero' }, true)}>Build Your AI Risk Officer — $49</a>
              <a href="#fix" className="mm-btn mm-btn-ghost mm-btn-lg">See how it works</a>
            </div>
            <p className="mm-microtrust">No signals. No bots. No guru fantasy. Just a pre-trade process.</p>
          </div>
          <div className="mm-hero-card">
            <VerdictCard />
          </div>
        </div>
        <div className="mm-hero-glow" aria-hidden="true" />
      </section>

      {/* STAT HOOK */}
      <section className="mm-stathook">
        <div className="mm-wrap">
          <p className="mm-stathook-big">8</p>
          <p className="mm-stathook-text">
            steps. That's all it takes to blow a funded challenge — and most traders run the
            exact same eight, every time. Not because they can't read a chart. Because nothing
            stops them clicking when they shouldn't.
          </p>
        </div>
      </section>

      {/* PAIN */}
      <section className="mm-section mm-pain mm-reveal" id="problem">
        <div className="mm-wrap">
          <h2 className="mm-h2">
            The market doesn't have to beat you.<br />
            <span className="mm-red">Your habits do it first.</span>
          </h2>
          <div className="mm-spiral">
            {PAIN_STEPS.map((step, i) => (
              <div className={`mm-step ${i >= 3 ? 'mm-step-hot' : ''}`} key={step}>
                <span className="mm-step-n">{String(i + 1).padStart(2, '0')}</span>
                <span className="mm-step-t">{step}</span>
              </div>
            ))}
          </div>
          <p className="mm-pain-out">
            The next challenge won't save you if you carry the same behavior into it.
          </p>
        </div>
      </section>

      {/* MECHANISM */}
      <section className="mm-section mm-mech mm-reveal" id="fix">
        <div className="mm-wrap">
          <span className="mm-eyebrow mm-eyebrow-teal">The Fix</span>
          <h2 className="mm-h2">Build your <span className="mm-teal">AI Risk Officer</span></h2>
          <p className="mm-lead mm-lead-mid">
            Put a risk process between your emotions and your funded account.
            AI checks the setup before your emotions ever touch the mouse.
          </p>

          <div className="mm-flow">
            {FLOW.map(([n, t, d]) => (
              <div className="mm-flow-step" key={n}>
                <span className="mm-flow-n">{n}</span>
                <span className="mm-flow-t">{t}</span>
                <span className="mm-flow-d">{d}</span>
              </div>
            ))}
          </div>

          <div className="mm-states">
            <div className="mm-state mm-state-go">
              <span className="mm-state-label">TRADE</span>
              <span className="mm-state-sub">Setup fits the rules. You're in.</span>
            </div>
            <div className="mm-state mm-state-wait">
              <span className="mm-state-label">WAIT</span>
              <span className="mm-state-sub">Unclear. You wait for confirmation.</span>
            </div>
            <div className="mm-state mm-state-no">
              <span className="mm-state-label">NO TRADE</span>
              <span className="mm-state-sub">You're breaking your rules. Stand down.</span>
            </div>
          </div>

          <p className="mm-mech-note">
            AI won't press the button. It helps stop you from <strong>pressing the wrong one.</strong>
          </p>

          <div className="mm-tech">
            {['Claude', 'Codex', 'TradingView MCP', 'Pine Script'].map((t) => (
              <span className="mm-chip" key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* STATEMENT BAND */}
      <section className="mm-band mm-reveal">
        <div className="mm-wrap">
          <p className="mm-band-text">NO PROCESS. NO PAYOUT.</p>
          <p className="mm-band-sub">Your next payout starts before the entry — not after it.</p>
        </div>
      </section>

      {/* WHAT YOU'RE BUILDING — value stack */}
      <section className="mm-section mm-system mm-reveal" id="inside">
        <div className="mm-wrap">
          <span className="mm-eyebrow mm-eyebrow-teal mm-eyebrow-c">What you're building</span>
          <h2 className="mm-h2 mm-center">Not an ebook. <span className="mm-teal">A system.</span></h2>
          <p className="mm-lead mm-lead-mid mm-center">
            Six components that turn "I know better" into a process you actually follow under pressure.
          </p>
          <div className="mm-sys-grid">
            {SYSTEM.map((s) => (
              <div className={`mm-sys-card ${s.tag ? 'mm-sys-card-core' : ''}`} key={s.t}>
                <span className="mm-sys-v">{s.v}</span>
                {s.tag && <span className="mm-sys-tag">{s.tag}</span>}
                <span className="mm-sys-t">{s.t}</span>
                <span className="mm-sys-d">{s.d}</span>
              </div>
            ))}
          </div>
          <div className="mm-sys-total">
            <span>Total value</span>
            <span className="mm-sys-total-was">$450</span>
            <span className="mm-sys-total-now">Yours today: $49</span>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="mm-section mm-whofor mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">IS THIS YOU?</h2>
          <div className="mm-whofor-grid">
            {WHOFOR.map(([t, d]) => (
              <div className="mm-whofor-card" key={t}>
                <span className="mm-whofor-t">{t}</span>
                <span className="mm-whofor-d">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING — urgency + seats */}
      <section className="mm-section mm-pricing mm-reveal" id="price">
        <div className="mm-wrap">
          <div className="mm-price-proof" role="list" aria-label="Proof">
            <span className="mm-price-proof-item" role="listitem"><strong>4.9/5</strong> from 500+ traders</span>
            <span className="mm-price-proof-sep" aria-hidden="true" />
            <span className="mm-price-proof-item" role="listitem"><strong>$30K+</strong> in member payouts</span>
            <span className="mm-price-proof-sep" aria-hidden="true" />
            <span className="mm-price-proof-item" role="listitem"><strong>6-part</strong> operator system</span>
          </div>
        </div>
        <div className="mm-wrap mm-price-wrap">
          <div className="mm-price-card">
            <div className="mm-price-urgency"><span className="mm-price-urgency-dot" />Founder price ends in <Countdown /></div>
            <span className="mm-price-tag">One-time access · founder price</span>
            <div className="mm-price-amount"><span className="mm-price-was">$149</span>$49</div>
            <div className="mm-price-seats">
              <div className="mm-price-seats-bar"><div className="mm-price-seats-fill" style={{ width: '74%' }} /></div>
              <span className="mm-price-seats-label">37 of 50 founder seats taken</span>
            </div>
            <ul className="mm-price-list">
              <li>The AI Risk Officer System — the full pre-trade process</li>
              <li>The Prompt Pack — copy-paste Claude prompts</li>
              <li>The Challenge Kill-Switch — daily-loss + tilt guardrails</li>
              <li>Failed-Challenge Autopsy — find what keeps blowing you up</li>
              <li>Payout-Ready Routine + 7-Day Challenge Prep Plan</li>
            </ul>
            <a href={CHECKOUT_HREF} className="mm-btn mm-btn-lg mm-btn-full" rel="noopener nofollow" onClick={() => track('InitiateCheckout', 'begin_checkout', { value: 49, currency: 'USD', source: 'pricing' })}>Build Your AI Risk Officer — $49</a>
            <p className="mm-price-fine">14-day refund policy · Educational material.</p>
          </div>
          <div className="mm-price-side">
            <h3 className="mm-h3">Build the system before the next challenge.</h3>
            <p>
              Another reset won't fix revenge trading. Another account won't fix random stops.
              Process first — payout second.
            </p>
            <p className="mm-price-side-strong">Build the brake once. Use it on every challenge.</p>
          </div>
        </div>
      </section>

      {/* PAYOUTS */}
      <section className="mm-section mm-payouts mm-reveal" id="payouts">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">REAL PAYOUTS FROM THE EBOOK PROCESS</h2>
          <p className="mm-lead mm-center mm-lead-mid">
            Traders who built their routine from this system passed funded accounts and cashed out.
            This is what happens when someone actually runs the process you get inside.
          </p>
        </div>

        <AutoScroller className="mm-scroller-cert" ariaLabel="Verified payouts" speed={0.55}>
          {cards.map((p, i) => (
            <figure className="mm-cert" role="listitem" key={p.name + i}>
              <img
                className="mm-cert-img"
                src={p.src}
                alt={`Payout certificate — ${p.firm} — ${p.name} ${p.amount}`}
                width={300}
                height={208}
              />
            </figure>
          ))}
        </AutoScroller>

        <div className="mm-wrap">
          <p className="mm-disclaimer">
            Real prop-firm payouts (FTMO, Maven, FXIFY, TopOne and others). Individual trader
            results — what you make depends on you running the process.
          </p>
        </div>
      </section>

      {/* VERIFIED PERFORMANCE — myfxbook-style interactive widget */}
      <section className="mm-section mm-perf mm-reveal" id="performance">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">THE PROCESS, ON A CHART</h2>
          <p className="mm-lead mm-center mm-lead-mid">
            A real funded trader ran the pre-trade process built in this ebook. Verified equity
            curve, month-by-month returns, and the full trade log showing the rules were followed,
            not guessed.
          </p>

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
        </div>
      </section>

      {/* VERIFIED REVIEWS — Trustpilot-style */}
      <section className="mm-reviews mm-reveal" id="reviews">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center mm-reviews-h">OUR VERIFIED REVIEWS</h2>
          <p className="mm-reviews-sub">Rated <strong>4.9</strong> out of 5 based on <strong>500+</strong> reviews</p>
        </div>
        {reviewRows.map((row, ri) => (
          <AutoScroller className="mm-scroller-rev" key={ri} reverse={ri === 1} speed={0.32} lock>
            {row.map((r, i) => (
              <div className="mm-rev-card" role="listitem" key={r.name + i}>
                <div className="mm-rev-stars">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <span className="mm-rev-star" key={s}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.785 1.401 8.168L12 18.896l-7.335 3.857 1.401-8.168L.132 9.21l8.2-1.192z" /></svg>
                    </span>
                  ))}
                </div>
                <div className="mm-rev-name">{r.name}</div>
                <p className="mm-rev-text">{r.text}</p>
                <div className="mm-rev-meta">
                  <span>{r.ago}</span>
                  <span className="mm-rev-verified">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z" /></svg>
                    Verified
                  </span>
                </div>
              </div>
            ))}
          </AutoScroller>
        ))}
      </section>

      {/* FAQ */}
      <section className="mm-section mm-faq mm-reveal">
        <div className="mm-wrap">
          <h2 className="mm-h2 mm-center">FAQ</h2>
          <div className="mm-faq-grid">
            {FAQ.map((f) => (
              <div className="mm-faq-item" key={f.q}>
                <span className="mm-faq-q">{f.q}</span>
                <span className="mm-faq-a">{f.a}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSER LETTER */}
      <section className="mm-section mm-letter mm-reveal" id="letter">
        <div className="mm-wrap">
          <div className="mm-letter-body">
            <p className="mm-letter-lead">Dear trader,</p>
            <p>You buy the challenge, you start clean. Then one loss hits and your hand is already back on the mouse. Revenge trade. Bigger size. Random stop. Daily limit gone. Reset. Again. You've seen this movie before.</p>
            <p className="mm-letter-punch">Another course won't fix that. Another Discord call won't either.</p>
            <p>You're not untalented. You're trading without a brake, and every prop firm is built to punish exactly that. <strong>The AI Risk Officer System</strong> is the brake: it stops you <em>before</em> you click. Trade, wait, or stand down. No signals. No bot. Just a pre-trade process that keeps revenge mode from wrecking another account.</p>
            <p className="mm-letter-punch">Your next payout starts before the entry, not after you rage-click into another reset.</p>
            <div className="mm-letter-cta-wrap">
              <a href="#price" className="mm-btn mm-btn-lg" onClick={() => track('CTAClick', 'cta_click', { source: 'letter' }, true)}>Lock in the founder price — $49</a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER — minimal variant */}
      <footer className="mm-footer">
        <div className="mm-wrap mm-footer-center">
          <img className="mm-logo-img mm-logo-img-sm" src="/logo.svg" alt="Forex Passing" />
          <nav className="mm-footer-nav">
            <a href="#payouts">Client Payouts</a>
            <a href="#performance">Past Performance</a>
            <a href="#reviews">Reviews</a>
          </nav>
          <span className="mm-footer-copy">© {new Date().getFullYear()} Forex Passing · forexpassing.com</span>
        </div>
      </footer>

      <div className="mm-sticky-bar">
        <a href="#price" className="mm-sticky-cta" onClick={() => track('CTAClick', 'cta_click', { source: 'sticky' }, true)}>Get the System · $49</a>
      </div>
    </div>
  )
}

const CSS = `
html{scroll-behavior:smooth}
.mm-root{
  --bg:#ffffff; --bg2:#f4f7f5; --line:rgba(15,30,22,.10);
  --txt:#10231a; --mut:#5b675f; --teal:#16a34a; --red:#ef4444;
  --ease:cubic-bezier(.22,.61,.36,1);
  background:var(--bg); color:var(--txt);
  font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
  line-height:1.6; -webkit-font-smoothing:antialiased; overflow-x:hidden;
  padding-top:42px;
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

/* VERDICT CARD — AI Risk Officer mock */
.mm-vcard{width:100%;max-width:380px;background:#0c1512;color:#e8f0ec;border:1px solid rgba(255,255,255,.08);
  border-radius:18px;padding:20px;box-shadow:0 24px 60px rgba(8,20,15,.45);text-align:left}
.mm-vcard-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.mm-vcard-title{font-family:'Anton',sans-serif;font-size:16px;letter-spacing:.06em;color:#fff}
.mm-vcard-live{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:700;letter-spacing:.1em;color:#39d98a}
.mm-vcard-dot{width:7px;height:7px;border-radius:50%;background:#39d98a;animation:mm-pulse 1.6s infinite}
@keyframes mm-pulse{0%{box-shadow:0 0 0 0 rgba(57,217,138,.55)}70%{box-shadow:0 0 0 8px rgba(57,217,138,0)}100%{box-shadow:0 0 0 0 rgba(57,217,138,0)}}
.mm-vcard-setup{font-size:12px;color:#9fb0a8;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);
  border-radius:8px;padding:9px 12px;margin-bottom:14px;font-weight:600;letter-spacing:.02em}
.mm-vcard-checks{display:grid;gap:8px;margin-bottom:16px}
.mm-vcheck{display:flex;align-items:center;gap:10px;font-size:13px;color:#cdd8d2}
.mm-vcheck-ico{flex:0 0 18px;width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800}
.mm-vcheck-ok .mm-vcheck-ico{background:rgba(57,217,138,.16);color:#39d98a}
.mm-vcheck-bad .mm-vcheck-ico{background:rgba(255,107,93,.16);color:#ff6b5d}
.mm-vcheck-bad{color:#f3c9c4}
.mm-vcard-verdict{font-family:'Anton',sans-serif;font-size:34px;letter-spacing:.04em;text-align:center;color:#fff;
  background:linear-gradient(180deg,#e0544a,#c0392b);border-radius:12px;padding:14px;margin-bottom:10px}
.mm-vcard-foot{font-size:12px;color:#8a988f;text-align:center;font-style:italic}

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
.mm-mech-note{font-size:18px;margin:6px 0 26px}
.mm-tech{display:flex;gap:10px;flex-wrap:wrap}
.mm-chip{font-size:13px;font-weight:600;color:var(--txt);border:1px solid var(--line);border-radius:999px;padding:8px 16px;background:rgba(0,0,0,.02)}

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
.mm-sys-t{display:block;font-weight:800;font-size:17px;margin-bottom:6px;padding-right:54px}
.mm-sys-d{display:block;color:var(--mut);font-size:14px;line-height:1.55}
.mm-sys-v{position:absolute;top:18px;right:20px;font-weight:800;font-size:14px;color:var(--mut);text-decoration:line-through;opacity:.65}
.mm-sys-total{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;border:1px dashed rgba(22,163,74,.4);border-radius:14px;padding:18px 24px;font-weight:700}
.mm-sys-total-was{text-decoration:line-through;color:var(--mut)}
.mm-sys-total-now{font-family:'Anton',sans-serif;font-size:24px;color:var(--teal)}

/* WHO IT'S FOR */
.mm-whofor{background:var(--bg2);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.mm-whofor-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:30px}
@media(max-width:760px){.mm-whofor-grid{grid-template-columns:1fr}}
.mm-whofor-card{border:1px solid var(--line);border-radius:14px;padding:24px;background:#fff}
.mm-whofor-t{display:block;font-family:'Anton',sans-serif;font-size:20px;text-transform:uppercase;margin-bottom:8px}
.mm-whofor-d{display:block;color:var(--mut);font-size:14px;line-height:1.6}

/* PAYOUTS / REVIEWS SCROLLER (drag + auto-advance) */
.mm-payouts{overflow:hidden}
.mm-scroller{overflow-x:auto;overflow-y:hidden;touch-action:pan-x;cursor:grab;scrollbar-width:none;-ms-overflow-style:none;
  -webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);
  mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.mm-scroller:active{cursor:grabbing}
.mm-scroller-lock{overflow-x:hidden;touch-action:pan-y;cursor:default}
.mm-scroller::-webkit-scrollbar{display:none}
.mm-scroller-track{display:flex;width:max-content}
.mm-scroller-cert{margin:42px 0 28px}
.mm-scroller-cert .mm-scroller-track{gap:20px}
.mm-cert{flex:0 0 auto;width:300px;height:208px;border-radius:14px;overflow:hidden;border:1px solid var(--line);background:#fff;box-shadow:0 4px 18px rgba(15,30,22,.08)}
.mm-cert-img{width:100%;height:100%;object-fit:contain;display:block;pointer-events:none}
.mm-disclaimer{font-size:13px;color:var(--mut);line-height:1.6;max-width:760px;margin:0 auto;text-align:center}

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
.mm-price-tag{display:block;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--teal)}
.mm-price-amount{font-family:'Anton',sans-serif;font-size:clamp(48px,12vw,72px);line-height:1;margin:8px 0 18px}
.mm-price-amount span{font-size:30px;color:var(--mut)}
.mm-price-was{text-decoration:line-through;-webkit-text-decoration-color:var(--red);text-decoration-color:var(--red);margin-right:12px}
.mm-price-seats{margin:0 0 22px}
.mm-price-seats-bar{height:8px;border-radius:999px;background:rgba(0,0,0,.08);overflow:hidden}
.mm-price-seats-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#16a34a,#f59e0b)}
.mm-price-seats-label{display:block;font-size:12px;color:var(--mut);margin-top:8px;font-weight:600}
.mm-price-list{list-style:none;margin:0 0 26px}
.mm-price-list li{position:relative;padding:9px 0 9px 28px;border-bottom:1px solid var(--line);font-size:15px}
.mm-price-list li:before{content:"";position:absolute;left:0;top:14px;width:14px;height:8px;border-left:2px solid var(--teal);border-bottom:2px solid var(--teal);transform:rotate(-45deg)}
.mm-price-fine{font-size:12px;color:var(--mut);margin-top:14px;text-align:center}
.mm-price-side h3{color:var(--txt)}
.mm-price-side p{color:var(--mut);font-size:16px;margin-bottom:14px}
.mm-price-side-strong{color:var(--txt)!important;font-weight:700}

/* FAQ */
.mm-faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:30px}
@media(max-width:760px){.mm-faq-grid{grid-template-columns:1fr}}
.mm-faq-item{border:1px solid var(--line);border-radius:12px;padding:22px;background:rgba(0,0,0,.02)}
.mm-faq-q{display:block;font-weight:700;font-size:16px;margin-bottom:8px}
.mm-faq-a{display:block;color:var(--mut);font-size:14px;line-height:1.6}

/* FOOTER */
.mm-footer{border-top:1px solid var(--line);padding:46px 0;background:var(--bg2)}
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

/* STICKY CTA — white bar + centered pill button */
.mm-sticky-bar{
  position:fixed;left:0;right:0;bottom:0;z-index:60;
  display:flex;justify-content:center;align-items:center;
  background:#fff;border-top:1px solid var(--line);
  box-shadow:0 -4px 18px rgba(15,30,22,.06);
  padding:16px 24px;padding-bottom:max(16px, env(safe-area-inset-bottom));
}
.mm-sticky-cta{
  display:inline-block;background:var(--teal);color:#fff;
  font-family:'Anton',sans-serif;font-weight:400;
  font-size:clamp(15px,3.6vw,17px);letter-spacing:.04em;text-transform:uppercase;
  text-decoration:none;text-align:center;border-radius:10px;
  padding:16px 44px;border:none;
  box-shadow:0 8px 22px rgba(22,163,74,.34);
  transition:transform .15s ease, box-shadow .15s ease, background .15s ease;
  width:auto;max-width:480px;
}
.mm-sticky-cta:hover{background:#15803d;transform:translateY(-1px);box-shadow:0 12px 28px rgba(22,163,74,.40)}
.mm-sticky-cta:active{transform:translateY(0)}
@media(max-width:760px){
  .mm-sticky-bar{padding:14px 16px;padding-bottom:max(14px, env(safe-area-inset-bottom))}
  .mm-sticky-cta{display:block;width:100%;max-width:100%;padding:18px 20px;font-size:16px}
}
.mm-root{padding-bottom:calc(88px + env(safe-area-inset-bottom))}

@media (prefers-reduced-motion: reduce){
  html{scroll-behavior:auto}
  .mm-ticker-track{animation:none}
  .mm-vcard-dot,.mm-price-urgency-dot{animation:none}
  .mm-reveal{opacity:1;transform:none;transition:none}
  .mm-btn{transition:none}
}
`
