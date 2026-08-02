// Forex Passing — the full track record panel.
//
// Same shape as the trader dashboard the offer page links out to on the
// reference funnel: header stats, clickable risk profiles that swap every
// number on the panel, equity curve, monthly returns, trade duration split and
// symbol exposure.
//
// Two differences from the page we modelled it on, both deliberate:
//   1. It is ours, under our name — no third-party logo and no "verified by".
//   2. It says plainly that these are our own figures, not an outside audit.
//
// Rendered twice: inside a modal from the offer page, and as the whole of
// /past-performance.

import { useEffect, useRef, useState } from 'react'
import { BRAND } from '../constants'
import {
  equityCurve,
  MONTH_LABELS,
  RISK_PROFILES,
  STARTING_BALANCE,
  SYMBOL_EXPOSURE,
  TRACKED_MONTHS,
  type RiskProfile,
} from '../data/track-record'

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`

export function TrackRecord({ compact = false }: { compact?: boolean }) {
  const [id, setId] = useState('balanced')
  const profile = RISK_PROFILES.find((p) => p.id === id) ?? RISK_PROFILES[1]

  return (
    <div className={`mm-tr${compact ? ' is-compact' : ''}`}>
      <TrackHeader profile={profile} selected={id} onSelect={setId} />
      <StatRow profile={profile} />

      <div className="mm-tr-grid">
        <Panel title="Equity curve" wide>
          <EquityChart profile={profile} />
        </Panel>

        <Panel title="Monthly returns">
          <MonthlyBars profile={profile} />
        </Panel>

        <Panel title="Trade duration">
          <DistributionBars
            rows={profile.tradeDistribution.map((d) => ({ label: d.duration, value: d.count }))}
            suffix=" trades"
          />
        </Panel>

        <Panel title="Symbol exposure">
          <DistributionBars
            rows={SYMBOL_EXPOSURE.map((s) => ({ label: s.symbol, value: s.percentage }))}
            suffix="%"
          />
        </Panel>

        <Panel title="Risk detail">
          <dl className="mm-tr-defs">
            <Def k="Risk score" v={`${profile.riskScore} / 100`} />
            <Def k="Consistency" v={`${profile.consistencyScore} / 100`} />
            <Def k="Avg risk per trade" v={`${profile.avgRiskPerTrade.toFixed(2)}%`} />
            <Def k="Avg risk : reward" v={`1 : ${profile.avgRiskReward.toFixed(2)}`} />
            <Def k="Best trade" v={money(profile.bestTrade)} good />
            <Def k="Worst trade" v={money(profile.worstTrade)} bad />
          </dl>
        </Panel>
      </div>

      <p className="mm-tr-note">
        These are {BRAND}'s own figures for accounts run at this risk setting over{' '}
        {TRACKED_MONTHS} months — <strong>not an independent audit</strong>, and not a promise.
        Every account is traded inside its own firm's rules, so an individual account will differ
        from what is shown here. An evaluation can fail and a funded account can be breached.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function TrackHeader({
  profile,
  selected,
  onSelect,
}: {
  profile: RiskProfile
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="mm-tr-head">
      <div className="mm-tr-ident">
        <span className="mm-tr-logo">
          <img src="/logo.svg" alt={BRAND} />
        </span>

        <div className="mm-tr-pills" role="tablist" aria-label="Risk profile">
          <span className="mm-tr-pill is-tag">Algo</span>
          {RISK_PROFILES.map((p) => (
            <button
              type="button"
              role="tab"
              aria-selected={p.id === selected}
              className={`mm-tr-pill${p.id === selected ? ' is-on' : ''}`}
              key={p.id}
              onClick={() => onSelect(p.id)}
            >
              {p.label}
            </button>
          ))}
          <span className="mm-tr-pill is-muted">
            {TRACKED_MONTHS} months · {profile.totalTrades} trades
          </span>
        </div>
      </div>

      <div className="mm-tr-headline">
        <div className="mm-tr-box">
          <span className="mm-tr-box-k">Starting balance</span>
          <span className="mm-tr-box-v">{money(STARTING_BALANCE)}</span>
        </div>
        <div className="mm-tr-box is-primary">
          <span className="mm-tr-box-k">Total return</span>
          <span className="mm-tr-box-v mm-pos">{pct(profile.totalReturn)}</span>
          <span className="mm-tr-box-sub">in {TRACKED_MONTHS} months</span>
        </div>
      </div>
    </div>
  )
}

function StatRow({ profile }: { profile: RiskProfile }) {
  const cells: [string, string, 'pos' | 'neg' | 'plain'][] = [
    ['Win rate', `${profile.winRate}%`, 'plain'],
    ['Profit factor', profile.profitFactor.toFixed(2), 'pos'],
    ['Max drawdown', `${profile.maxDrawdown}%`, 'neg'],
    ['Avg monthly', pct(profile.avgMonthlyReturn), 'pos'],
  ]
  return (
    <div className="mm-tr-stats">
      {cells.map(([k, v, tone]) => (
        <div className="mm-tr-stat" key={k}>
          <span className="mm-tr-stat-k">{k}</span>
          <span className={`mm-tr-stat-v${tone === 'pos' ? ' mm-pos' : tone === 'neg' ? ' mm-neg' : ''}`}>
            {v}
          </span>
        </div>
      ))}
    </div>
  )
}

function Panel({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`mm-tr-panel${wide ? ' is-wide' : ''}`}>
      <h3 className="mm-tr-panel-t">{title}</h3>
      {children}
    </section>
  )
}

function Def({ k, v, good, bad }: { k: string; v: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="mm-tr-def">
      <dt>{k}</dt>
      <dd className={good ? 'mm-pos' : bad ? 'mm-neg' : ''}>{v}</dd>
    </div>
  )
}

/** Area chart of the compounded balance. Hovering a point shows the month. */
function EquityChart({ profile }: { profile: RiskProfile }) {
  const points = equityCurve(profile)
  const [hover, setHover] = useState<number | null>(null)

  const W = 620
  const H = 190
  const PAD = 8
  const min = Math.min(STARTING_BALANCE, ...points.map((p) => p.balance))
  const max = Math.max(...points.map((p) => p.balance))
  const span = Math.max(1, max - min)
  const all = [{ month: 'Start', balance: STARTING_BALANCE }, ...points]

  const xy = all.map((p, i) => {
    const x = PAD + (i / (all.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((p.balance - min) / span) * (H - PAD * 2)
    return { ...p, x, y }
  })

  const line = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${xy[xy.length - 1].x.toFixed(1)},${H} L${xy[0].x.toFixed(1)},${H} Z`
  const active = hover === null ? null : xy[hover]

  return (
    <div className="mm-tr-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Equity curve">
        <defs>
          <linearGradient id="mm-tr-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--teal)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--teal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#mm-tr-grad)" />
        <path d={line} fill="none" stroke="var(--teal)" strokeWidth="2.5" strokeLinejoin="round" />
        {xy.map((p, i) => (
          <circle
            key={p.month + i}
            cx={p.x}
            cy={p.y}
            r={hover === i ? 5 : 3.5}
            fill="#fff"
            stroke="var(--teal)"
            strokeWidth="2"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      <div className="mm-tr-chart-x">
        {all.map((p, i) => (
          <span key={p.month + i}>{p.month}</span>
        ))}
      </div>
      <p className="mm-tr-chart-read">
        {active ? `${active.month}: ${money(active.balance)}` : `Ends at ${money(xy[xy.length - 1].balance)}`}
      </p>
    </div>
  )
}

function MonthlyBars({ profile }: { profile: RiskProfile }) {
  const top = Math.max(...profile.monthlyReturns.map((v) => Math.abs(v)))
  return (
    <div className="mm-tr-months">
      {profile.monthlyReturns.map((v, i) => (
        <div className="mm-tr-month" key={i}>
          <span className={`mm-tr-month-v${v < 0 ? ' mm-neg' : ''}`}>{v.toFixed(1)}%</span>
          <div className="mm-tr-month-track">
            <div
              className={`mm-tr-month-fill${v < 0 ? ' is-neg' : ''}`}
              style={{ height: `${(Math.abs(v) / top) * 100}%` }}
            />
          </div>
          <span className="mm-tr-month-k">{MONTH_LABELS[i] ?? i + 1}</span>
        </div>
      ))}
    </div>
  )
}

function DistributionBars({
  rows,
  suffix,
}: {
  rows: { label: string; value: number }[]
  suffix: string
}) {
  const top = Math.max(...rows.map((r) => r.value))
  return (
    <div className="mm-tr-dist">
      {rows.map((r) => (
        <div className="mm-tr-dist-row" key={r.label}>
          <span className="mm-tr-dist-k">{r.label}</span>
          <span className="mm-tr-dist-track">
            <span className="mm-tr-dist-fill" style={{ width: `${(r.value / top) * 100}%` }} />
          </span>
          <span className="mm-tr-dist-v">
            {r.value}
            {suffix}
          </span>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

/** The panel in a window, opened from the offer page. */
export function TrackRecordModal({ onClose }: { onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cardRef.current?.querySelector<HTMLElement>('button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="mm-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Full track record"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="mm-modal-card mm-modal-wide" ref={cardRef}>
        <button type="button" className="mm-modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="mm-modal-body">
          <TrackRecord compact />
          <div className="mm-cta-center mm-cta-center-tight">
            <a href="/past-performance" className="mm-btn mm-btn-ghost">Open the full page</a>
          </div>
        </div>
      </div>
    </div>
  )
}
