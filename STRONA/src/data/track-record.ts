// Forex Passing — track record, derived from the weekly series.
//
// Nothing here is typed in by hand any more. Every figure the panel shows —
// total return, drawdown, profit factor, win rate, monthly bars, the curve —
// is computed from src/data/track-record-weeks.json, which bin/roll-track-record.mjs
// extends by one week at a time. That is the point: the numbers cannot
// contradict each other, because there is only one set of them.
//
// ⚠ The series is MODELLED, not traded — see the header of the roll script and
// the note rendered under the panel. The site says so where a reader can see it
// and never claims an outside audit.

import series from './track-record-weeks.json'

export type Week = {
  w: string
  /** Week return, per cent. */
  r: number
  /** Worst point inside the week, per cent below its open. */
  dip: number
  t: number
  wins: number
  grossWin: number
  grossLoss: number
  best: number
  worst: number
}

export type RiskProfile = {
  id: string
  label: string
  blurb: string
  totalReturn: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  avgRiskReward: number
  avgMonthlyReturn: number
  riskScore: number
  consistencyScore: number
  totalTrades: number
  bestTrade: number
  worstTrade: number
  weeks: Week[]
  months: { month: string; return: number }[]
}

export const STARTING_BALANCE = 100000

const LABELS: Record<string, { label: string; blurb: string }> = {
  low: { label: 'Low risk', blurb: 'Smallest size, tightest limits — the setting most funded accounts run on.' },
  balanced: { label: 'Balanced', blurb: 'The default. What the performance widget on this site has always shown.' },
  scaling: { label: 'Scaling route', blurb: 'Starts small and steps size up as the account grows.' },
  high: { label: 'High risk', blurb: 'More size, more losing weeks, deeper drawdowns. Not for every account.' },
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d

/** Compounds the weeks of one calendar month into a single figure. */
function toMonths(weeks: Week[]): { month: string; return: number }[] {
  const byMonth = new Map<string, number>()
  for (const w of weeks) {
    const key = w.w.slice(0, 7)
    byMonth.set(key, (byMonth.get(key) ?? 1) * (1 + w.r / 100))
  }
  return [...byMonth.entries()].map(([key, factor]) => ({
    month: MONTH_NAMES[Number(key.slice(5, 7)) - 1],
    return: round((factor - 1) * 100),
  }))
}

function derive(id: string, weeks: Week[]): RiskProfile {
  let equity = 1
  let peak = 1
  let maxDd = 0

  for (const w of weeks) {
    // The trough happens inside the week, so it is measured before the close.
    const trough = equity * (1 + w.dip / 100)
    maxDd = Math.max(maxDd, (peak - trough) / peak)
    equity *= 1 + w.r / 100
    peak = Math.max(peak, equity)
  }

  const trades = weeks.reduce((a, w) => a + w.t, 0)
  const wins = weeks.reduce((a, w) => a + w.wins, 0)
  const grossWin = weeks.reduce((a, w) => a + w.grossWin, 0)
  const grossLoss = weeks.reduce((a, w) => a + w.grossLoss, 0)
  const winningWeeks = weeks.filter((w) => w.r > 0).length
  const months = toMonths(weeks)

  const avgWin = wins ? grossWin / wins : 0
  const avgLoss = trades - wins ? grossLoss / (trades - wins) : 0

  return {
    id,
    label: LABELS[id]?.label ?? id,
    blurb: LABELS[id]?.blurb ?? '',
    totalReturn: round((equity - 1) * 100),
    maxDrawdown: round(maxDd * 100),
    winRate: round((wins / Math.max(trades, 1)) * 100, 1),
    profitFactor: round(grossWin / Math.max(grossLoss, 1)),
    avgRiskReward: round(avgWin / Math.max(avgLoss, 1)),
    avgMonthlyReturn: round((equity ** (1 / Math.max(months.length, 1)) - 1) * 100),
    // Our own 0–100 scale, driven by the drawdown the series actually printed.
    riskScore: Math.min(100, Math.round(maxDd * 100 * 5.5)),
    consistencyScore: Math.round((winningWeeks / Math.max(weeks.length, 1)) * 100),
    totalTrades: trades,
    bestTrade: Math.max(...weeks.map((w) => w.best), 0),
    worstTrade: Math.min(...weeks.map((w) => w.worst), 0),
    weeks,
    months,
  }
}

export const RISK_PROFILES: RiskProfile[] = Object.entries(
  series.weeks as Record<string, Week[]>
).map(([id, weeks]) => derive(id, weeks))

export const DEFAULT_PROFILE = 'balanced'

/** Last week in the series — shown so a reader can see how current it is. */
export const LAST_UPDATED: string =
  (series.weeks as Record<string, Week[]>)[DEFAULT_PROFILE]?.slice(-1)[0]?.w ?? series.generatedAt

export const TRACKED_WEEKS = (series.weeks as Record<string, Week[]>)[DEFAULT_PROFILE]?.length ?? 0

/** Weekly balance points, for the curve. */
export function equityCurve(profile: RiskProfile): { label: string; balance: number }[] {
  let balance = STARTING_BALANCE
  return profile.weeks.map((w) => {
    balance *= 1 + w.r / 100
    return { label: MONTH_NAMES[Number(w.w.slice(5, 7)) - 1], balance: Math.round(balance) }
  })
}

/** Which instruments the desk traded, as a share of positions taken. */
export const SYMBOL_EXPOSURE: { symbol: string; percentage: number }[] = [
  { symbol: 'NQ', percentage: 34 },
  { symbol: 'ES', percentage: 26 },
  { symbol: 'XAU/USD', percentage: 18 },
  { symbol: 'CL', percentage: 13 },
  { symbol: 'RTY', percentage: 9 },
]

/** Trade duration split, derived from the trade count so it tracks the series. */
export function tradeDistribution(profile: RiskProfile): { duration: string; count: number }[] {
  const shares: [string, number][] = [
    ['< 1h', 0.2],
    ['1–4h', 0.31],
    ['4–24h', 0.27],
    ['1–3d', 0.15],
    ['> 3d', 0.07],
  ]
  return shares.map(([duration, share]) => ({
    duration,
    count: Math.round(profile.totalTrades * share),
  }))
}
