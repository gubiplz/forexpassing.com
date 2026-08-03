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

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { BRAND } from '../constants'
import {
  DEFAULT_PROFILE,
  equityCurve,
  LAST_UPDATED,
  RISK_PROFILES,
  STARTING_BALANCE,
  symbolExposure,
  tradeDistribution,
  TRACKED_SESSIONS,
  TRACKED_WEEKS,
  type RiskProfile,
} from '../data/track-record'

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`

export function TrackRecord({ compact = false }: { compact?: boolean }) {
  const [id, setId] = useState(DEFAULT_PROFILE)
  const profile = RISK_PROFILES.find((p) => p.id === id) ?? RISK_PROFILES[0]

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
            rows={tradeDistribution(profile).map((d) => ({ label: d.duration, value: d.count }))}
            suffix=" trades"
          />
        </Panel>

        <Panel title="Symbol exposure">
          <DistributionBars
            rows={symbolExposure(profile).map((s) => ({ label: s.symbol, value: s.percentage }))}
            suffix="%"
          />
        </Panel>

        <Panel title="Risk detail">
          <dl className="mm-tr-defs">
            <Def k="Risk score" v={`${profile.riskScore} / 100`} />
            <Def k="Consistency" v={`${profile.consistencyScore} / 100`} />
            <Def k="Avg risk : reward" v={`1 : ${profile.avgRiskReward.toFixed(2)}`} />
            <Def k="Winning weeks" v={`${profile.consistencyScore}%`} />
            <Def k="Best trade" v={money(profile.bestTrade)} good />
            <Def k="Worst trade" v={money(profile.worstTrade)} bad />
          </dl>
        </Panel>
      </div>

      <p className="mm-tr-note">
        {BRAND}'s own figures for accounts run at this setting: {TRACKED_SESSIONS} trading sessions
        across {TRACKED_WEEKS} weeks, last entry {LAST_UPDATED}. Sessions are added as they close,
        so gaps are days the desk did not trade: outside crypto, nothing is dated to a weekend.{' '}
        <strong>Not an independent audit</strong> and not a promise: every account trades inside its
        own firm's rules, so an individual account will differ from what is shown here. An
        evaluation can fail and a funded account can be breached.
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
            {TRACKED_WEEKS} weeks · {profile.totalTrades} trades
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
          <span className="mm-tr-box-sub">in {TRACKED_WEEKS} weeks</span>
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

/**
 * Growth curve, drawn the same way as the performance widget: gridlines, a
 * percentage axis and a hover readout.
 *
 * The line is a monotone cubic through the month-end points rather than a
 * polyline. Monotone matters here — a plain spline overshoots between points
 * and would draw dips the account never had.
 */
function EquityChart({ profile }: { profile: RiskProfile }) {
  const ref = useRef<SVGSVGElement | null>(null)
  const [idx, setIdx] = useState<number | null>(null)

  const points = equityCurve(profile)
  const growth = [0, ...points.map((p) => (p.balance / STARTING_BALANCE - 1) * 100)]
  const labels = ['Start', ...points.map((p) => p.label)]
  const n = growth.length

  // One tick per month, at the first session that falls in it.
  const ticks = labels.reduce<[number, string][]>((acc, lab, i) => {
    if (i > 0 && lab !== labels[i - 1]) acc.push([i, lab])
    return acc
  }, [])

  const W = 760
  const H = 260
  const P = { l: 52, r: 18, t: 18, b: 34 }
  const lo = Math.min(0, ...growth)
  const hi = Math.max(...growth)
  const pad = (hi - lo) * 0.08 || 1
  const top = hi + pad
  const bottom = Math.min(0, lo - pad)

  const xx = (i: number) => P.l + (i * (W - P.l - P.r)) / (n - 1)
  const yy = (v: number) => P.t + (1 - (v - bottom) / (top - bottom)) * (H - P.t - P.b)

  const line = monotonePath(growth.map((v, i) => [xx(i), yy(v)]))
  const area = `${line} L${xx(n - 1).toFixed(1)} ${yy(bottom).toFixed(1)} L${xx(0).toFixed(1)} ${yy(bottom).toFixed(1)} Z`

  // Round gridlines across the range the curve covers. Picking a single "nice"
  // step can leave one lonely line on a wide range, so take the largest step
  // from the ladder that still draws at least four.
  const grid = gridLines(bottom, top)

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.max(0, Math.min(n - 1, Math.round((px - P.l) / ((W - P.l - P.r) / (n - 1)))))
    setIdx(i)
  }

  const balanceAt = (i: number) => (i === 0 ? STARTING_BALANCE : points[i - 1].balance)
  const dateAt = (i: number) => (i === 0 ? 'Start' : points[i - 1].date)
  const tipX = idx == null ? 0 : Math.min(Math.max(xx(idx) - 68, 4), W - 140)

  return (
    <div className="mm-tr-chart">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        onMouseMove={onMove}
        onMouseLeave={() => setIdx(null)}
        role="img"
        aria-label={`Growth curve, ${profile.label}`}
      >
        <defs>
          <linearGradient id="mm-tr-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1faa6f" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#1faa6f" stopOpacity="0" />
          </linearGradient>
        </defs>

        {grid.map((g) => (
          <g key={g}>
            <line className="mm-eq-grid" x1={P.l} y1={yy(g)} x2={W - P.r} y2={yy(g)} />
            <text className="mm-eq-axis" x={P.l - 8} y={yy(g) + 4} textAnchor="end">
              {g > 0 ? '+' : ''}{g}%
            </text>
          </g>
        ))}

        {ticks.map(([i, lab]) => (
          <text key={lab + i} className="mm-eq-axis" x={xx(i)} y={H - 10} textAnchor="middle">{lab}</text>
        ))}

        <path d={area} fill="url(#mm-tr-grad)" />
        <path d={line} fill="none" stroke="#1faa6f" strokeWidth="2.4" strokeLinecap="round" />

        {idx != null && (
          <g>
            <line className="mm-eq-cross" x1={xx(idx)} y1={P.t} x2={xx(idx)} y2={H - P.b} />
            <circle cx={xx(idx)} cy={yy(growth[idx])} r="4.5" fill="#1faa6f" stroke="#fff" strokeWidth="2" />
            <g transform={`translate(${tipX}, 8)`}>
              <rect className="mm-eq-tip" width="136" height="46" rx="7" />
              <text className="mm-eq-tip-d" x="10" y="18">{dateAt(idx)}</text>
              <text className="mm-eq-tip-b" x="10" y="34">{money(balanceAt(idx))}</text>
              <text className="mm-eq-tip-g" x="126" y="34" textAnchor="end">
                {growth[idx] > 0 ? '+' : ''}{growth[idx].toFixed(1)}%
              </text>
            </g>
          </g>
        )}
      </svg>
    </div>
  )
}

/** Largest round step that still draws at least four lines across the range. */
function gridLines(bottom: number, top: number): number[] {
  const ladder = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500]
  for (let i = ladder.length - 1; i >= 0; i--) {
    const step = ladder[i]
    const lines: number[] = []
    for (let g = Math.ceil(bottom / step) * step; g <= top; g += step) {
      lines.push(Math.round(g * 100) / 100 || 0)
    }
    if (lines.length >= 4) return lines
  }
  return [0]
}

/** Fritsch–Carlson monotone cubic — smooth, and it never overshoots the data. */
function monotonePath(pts: [number, number][]): string {
  const n = pts.length
  if (n < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')

  const dx: number[] = []
  const slope: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0])
    slope.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]))
  }

  const m: number[] = [slope[0]]
  for (let i = 1; i < n - 1; i++) {
    if (slope[i - 1] * slope[i] <= 0) m.push(0)
    else {
      const w1 = 2 * dx[i] + dx[i - 1]
      const w2 = dx[i] + 2 * dx[i - 1]
      m.push((w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]))
    }
  }
  m.push(slope[n - 2])

  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i][0] + dx[i] / 3
    const c1y = pts[i][1] + (m[i] * dx[i]) / 3
    const c2x = pts[i + 1][0] - dx[i] / 3
    const c2y = pts[i + 1][1] - (m[i + 1] * dx[i]) / 3
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${pts[i + 1][0].toFixed(1)} ${pts[i + 1][1].toFixed(1)}`
  }
  return d
}

function MonthlyBars({ profile }: { profile: RiskProfile }) {
  const top = Math.max(...profile.months.map((m) => Math.abs(m.return)), 0.1)
  return (
    <div className="mm-tr-months">
      {profile.months.map(({ month, return: v }, i) => (
        <div className="mm-tr-month" key={month + i}>
          <span className={`mm-tr-month-v${v < 0 ? ' mm-neg' : ''}`}>{v.toFixed(1)}%</span>
          <div className="mm-tr-month-track">
            <div
              className={`mm-tr-month-fill${v < 0 ? ' is-neg' : ''}`}
              style={{ height: `${(Math.abs(v) / top) * 100}%` }}
            />
          </div>
          <span className="mm-tr-month-k">{month}</span>
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

  // Rendered on <body>: a transformed ancestor (any .mm-reveal section) would
  // otherwise become the containing block for position:fixed and the window
  // would open wherever that section happens to sit on the page.
  return createPortal(
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
    </div>,
    document.body
  )
}
