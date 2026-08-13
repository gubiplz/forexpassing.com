// The myfxbook-style performance widget: headline stats, interactive equity
// curve, monthly bars and the trade log. Rendered inline on the money page and
// as the whole of /past-performance.
//
// Its own module, not shared.tsx, on purpose: the widget's figures pull in the
// full session series (src/data/track-record.ts and its 120 KB JSON), and
// shared.tsx sits in the chunk every page downloads. Here the data rides only
// with the two pages that render the widget.

import { useRef, useState, type MouseEvent } from 'react'

// The summary widget's figures. They are NOT typed in here: they come from the
// same session series as the full track record panel, so the headline on the
// offer page and the headline inside the panel can never be two different
// claims about the same desk. See src/data/track-record.ts.
import { EQUITY, EQUITY_DATES, MONTHLY, STATS, TRADES } from '../data/track-record'

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

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
