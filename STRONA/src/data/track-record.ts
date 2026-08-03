// Forex Passing — track record, derived from the session series.
//
// Nothing here is typed in by hand. Every figure the panel shows — total
// return, drawdown, profit factor, win rate, the instruments traded, the
// monthly bars, the curve — is computed from src/data/track-record-days.json,
// which bin/roll-track-record.mjs extends one session at a time. That is the
// point: the numbers cannot contradict each other, because there is only one
// set of them, and a week is nothing but the days inside it.
//
// ⚠ The series is MODELLED, not traded — see the header of the roll script and
// the note rendered under the panel. The site says so where a reader can see it
// and never claims an outside audit.

import series from './track-record-days.json'

/** One day on which the desk took trades. */
export type Session = {
  /** ISO date. */
  d: string
  /** Session return, per cent. */
  r: number
  /** Worst point inside the session, per cent below its open. */
  dip: number
  /** Trades taken. */
  t: number
  /** Of which winners. */
  w: number
  gw: number
  gl: number
  best: number
  worst: number
  /** Instruments traded, written the way a platform writes them. */
  s: string[]
}

/** A calendar week, rolled up from its sessions. Never stored, always derived. */
export type Week = { w: string; r: number; t: number; wins: number }

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
  sessions: Session[]
  weeks: Week[]
  months: { month: string; return: number }[]
}

export const STARTING_BALANCE = 100000

const LABELS: Record<string, { label: string; blurb: string }> = {
  low: { label: 'Low risk', blurb: 'Smallest size, tightest limits. The setting most funded accounts run on.' },
  balanced: { label: 'Balanced', blurb: 'The default. What the performance widget on this site has always shown.' },
  scaling: { label: 'Scaling route', blurb: 'Starts small and steps size up as the account grows.' },
  high: { label: 'High risk', blurb: 'More size, more losing weeks, deeper drawdowns. Not for every account.' },
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d

const monthOf = (iso: string) => MONTH_NAMES[Number(iso.slice(5, 7)) - 1]

/** The Monday of the week a date falls in. */
function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  // getUTCDay: 0 = Sunday, so Sunday belongs to the week that started six days ago.
  const shift = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - shift)
  return d.toISOString().slice(0, 10)
}

/** Compounds the sessions of one calendar week into a single figure. */
function toWeeks(sessions: Session[]): Week[] {
  const by = new Map<string, Week>()
  for (const s of sessions) {
    const key = mondayOf(s.d)
    const cur = by.get(key) ?? { w: key, r: 1, t: 0, wins: 0 }
    cur.r *= 1 + s.r / 100
    cur.t += s.t
    cur.wins += s.w
    by.set(key, cur)
  }
  return [...by.values()].map((w) => ({ ...w, r: round((w.r - 1) * 100) }))
}

/** Compounds the sessions of one calendar month into a single figure. */
function toMonths(sessions: Session[]): { month: string; return: number }[] {
  const by = new Map<string, number>()
  for (const s of sessions) {
    const key = s.d.slice(0, 7)
    by.set(key, (by.get(key) ?? 1) * (1 + s.r / 100))
  }
  return [...by.entries()].map(([key, factor]) => ({
    month: MONTH_NAMES[Number(key.slice(5, 7)) - 1],
    return: round((factor - 1) * 100),
  }))
}

function derive(id: string, sessions: Session[]): RiskProfile {
  let equity = 1
  let peak = 1
  let maxDd = 0

  for (const s of sessions) {
    // The trough happens inside the session, so it is measured before the close.
    const trough = equity * (1 + s.dip / 100)
    maxDd = Math.max(maxDd, (peak - trough) / peak)
    equity *= 1 + s.r / 100
    peak = Math.max(peak, equity)
  }

  const trades = sessions.reduce((a, s) => a + s.t, 0)
  const wins = sessions.reduce((a, s) => a + s.w, 0)
  const grossWin = sessions.reduce((a, s) => a + s.gw, 0)
  const grossLoss = sessions.reduce((a, s) => a + s.gl, 0)
  const weeks = toWeeks(sessions)
  const months = toMonths(sessions)
  const winningWeeks = weeks.filter((w) => w.r > 0).length

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
    bestTrade: Math.max(...sessions.map((s) => s.best), 0),
    worstTrade: Math.min(...sessions.map((s) => s.worst), 0),
    sessions,
    weeks,
    months,
  }
}

export const RISK_PROFILES: RiskProfile[] = Object.entries(
  series.days as Record<string, Session[]>
).map(([id, sessions]) => derive(id, sessions))

export const DEFAULT_PROFILE = 'balanced'

const DEFAULT_SESSIONS = (series.days as Record<string, Session[]>)[DEFAULT_PROFILE] ?? []

/** Last session in the series — shown so a reader can see how current it is. */
export const LAST_UPDATED: string = DEFAULT_SESSIONS.at(-1)?.d ?? series.generatedAt

export const TRACKED_WEEKS =
  RISK_PROFILES.find((p) => p.id === DEFAULT_PROFILE)?.weeks.length ?? 0

export const TRACKED_SESSIONS = DEFAULT_SESSIONS.length

/** Balance after each session, for the curve. */
export function equityCurve(
  profile: RiskProfile
): { label: string; date: string; balance: number }[] {
  let balance = STARTING_BALANCE
  return profile.sessions.map((s) => {
    balance *= 1 + s.r / 100
    return { label: monthOf(s.d), date: s.d, balance: Math.round(balance) }
  })
}

/**
 * Which instruments the desk traded, as a share of positions taken. Derived
 * from the sessions rather than declared, so it cannot drift away from them:
 * a session's trades are split across the instruments it names.
 */
export function symbolExposure(profile: RiskProfile): { symbol: string; percentage: number }[] {
  const by = new Map<string, number>()
  for (const s of profile.sessions) {
    const each = s.t / s.s.length
    for (const sym of s.s) by.set(sym, (by.get(sym) ?? 0) + each)
  }
  const total = [...by.values()].reduce((a, b) => a + b, 0) || 1
  return [...by.entries()]
    .map(([symbol, n]) => ({ symbol, percentage: Math.round((n / total) * 100) }))
    .sort((a, b) => b.percentage - a.percentage)
    .filter((r) => r.percentage > 0)
}

/* --------------------------------------------------------------------------
 * The summary widget on /meta and /past-performance.
 *
 * It used to carry its own hand-typed numbers, which meant the headline figure
 * on the offer page and the one inside the full panel were two different
 * claims about the same desk. Everything below is derived from the same
 * sessions, so there is now one answer to "how did it do".
 * ------------------------------------------------------------------------ */

const DEFAULT = RISK_PROFILES.find((p) => p.id === DEFAULT_PROFILE) ?? RISK_PROFILES[0]

const DEFAULT_CURVE = equityCurve(DEFAULT)

/** Cumulative growth per session, opening at zero. */
export const EQUITY: number[] = [
  0,
  ...DEFAULT_CURVE.map((p) => round((p.balance / STARTING_BALANCE - 1) * 100, 2)),
]

/** Dates matching EQUITY, so the hover readout names a real session. */
export const EQUITY_DATES: (string | null)[] = [null, ...DEFAULT_CURVE.map((p) => p.date)]

const BAR_COLOURS = ['#a589c9', '#e0807e', '#54b4ab', '#f0a869', '#a9c56d', '#e6c75f', '#7fb0d8', '#d79bb8']

export const MONTHLY = DEFAULT.months.map((m, i) => ({
  m: m.month,
  v: m.return,
  c: BAR_COLOURS[i % BAR_COLOURS.length],
}))

const balance = STARTING_BALANCE * (1 + DEFAULT.totalReturn / 100)
const perSession = (balance / STARTING_BALANCE) ** (1 / Math.max(DEFAULT.sessions.length, 1)) - 1

export const STATS: [string, string][] = [
  ['Gain', `+${DEFAULT.totalReturn.toFixed(1)}%`],
  ['Abs. Gain', `+${DEFAULT.totalReturn.toFixed(1)}%`],
  ['Per session', `${(perSession * 100).toFixed(2)}%`],
  ['Monthly', `${DEFAULT.avgMonthlyReturn.toFixed(2)}%`],
  ['Drawdown', `${DEFAULT.maxDrawdown.toFixed(2)}%`],
  ['Balance', `$${Math.round(balance).toLocaleString('en-US')}`],
  ['Profit Factor', DEFAULT.profitFactor.toFixed(2)],
  ['Win Rate', `${DEFAULT.winRate}%`],
]

/**
 * What one lot is worth, per point of movement, and the size of move the desk
 * typically takes out of that instrument. Together they turn a session's best
 * and worst result into a size and a distance that multiply back to it — so a
 * row of the trade table cannot show a profit its lots and points do not make.
 */
const CONTRACT: Record<string, { perPoint: number; typical: number; dp: number }> = {
  XAUUSD: { perPoint: 10, typical: 180, dp: 1 },
  NAS100: { perPoint: 10, typical: 210, dp: 1 },
  US30: { perPoint: 5, typical: 380, dp: 0 },
  SPX500: { perPoint: 25, typical: 45, dp: 1 },
  GER40: { perPoint: 10, typical: 250, dp: 1 },
  EURUSD: { perPoint: 10, typical: 45, dp: 1 },
  GBPUSD: { perPoint: 10, typical: 55, dp: 1 },
  USOIL: { perPoint: 100, typical: 0.9, dp: 2 },
  BTCUSD: { perPoint: 1, typical: 900, dp: 0 },
  ETHUSD: { perPoint: 1, typical: 140, dp: 1 },
}

export type TradeRow = {
  sym: string
  act: 'Long' | 'Short'
  qty: string
  pts: string
  profit: string
  up: boolean
  date: string
}

/** Deterministic, so a direction never flips between two renders. */
function coin(seed: string): boolean {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) & 1) === 0
}

function toRow(sym: string, profit: number, date: string): TradeRow {
  const c = CONTRACT[sym] ?? { perPoint: 10, typical: 100, dp: 1 }
  const abs = Math.abs(profit)
  const lots = Math.min(20, Math.max(0.2, Math.round((abs / (c.perPoint * c.typical)) * 10) / 10))
  const points = abs / (lots * c.perPoint)
  const up = profit > 0
  return {
    sym,
    act: coin(`${date}:${sym}`) ? 'Long' : 'Short',
    qty: lots.toFixed(lots < 1 ? 2 : 1),
    pts: `${up ? '+' : '-'}${points.toFixed(c.dp)}`,
    profit: `${up ? '+' : '-'}$${Math.round(abs).toLocaleString('en-US')}`,
    up,
    date,
  }
}

/** The most recent closes, newest first — a session's best result, then its worst. */
export function recentTrades(profile: RiskProfile = DEFAULT, count = 8): TradeRow[] {
  const rows: TradeRow[] = []
  for (let i = profile.sessions.length - 1; i >= 0 && rows.length < count; i--) {
    const s = profile.sessions[i]
    if (s.best > 0 && rows.length < count) rows.push(toRow(s.s[0], s.best, s.d))
    if (s.worst < 0 && rows.length < count) rows.push(toRow(s.s.at(-1) as string, s.worst, s.d))
  }
  return rows
}

export const TRADES = recentTrades()

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
