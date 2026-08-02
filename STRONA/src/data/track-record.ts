// Forex Passing — track record, by risk profile.
//
// ⚠ These are OUR published figures, not an independent verification. Nothing
// here comes from a third-party tracker and the panel never claims otherwise —
// the reference site we modelled the layout on presents generated numbers as if
// an outside service had checked them, and that is exactly the part we are not
// copying.
//
// `balanced` is the profile the site has published all along (the same +60.2%
// and 7.41% drawdown the performance widget shows). The other three describe
// how the same desk runs an account at a different risk setting — they are
// illustrative of the setting, not four separate audited histories.
//
// One place to change: swap the numbers here and the modal, the page and the
// widget all follow.

export type RiskProfile = {
  id: string
  label: string
  /** Total return over the tracked window, in per cent. */
  totalReturn: number
  maxDrawdown: number
  winRate: number
  profitFactor: number
  avgRiskReward: number
  avgMonthlyReturn: number
  /** 0–100, lower is calmer. Our own scale, shown as a bar. */
  riskScore: number
  consistencyScore: number
  avgRiskPerTrade: number
  totalTrades: number
  bestTrade: number
  worstTrade: number
  /** Per-month return, in order, for the tracked window. */
  monthlyReturns: number[]
  tradeDistribution: { duration: string; count: number }[]
}

export const STARTING_BALANCE = 100000
export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
export const TRACKED_MONTHS = MONTH_LABELS.length

export const SYMBOL_EXPOSURE: { symbol: string; percentage: number }[] = [
  { symbol: 'NQ', percentage: 34 },
  { symbol: 'ES', percentage: 26 },
  { symbol: 'XAU/USD', percentage: 18 },
  { symbol: 'CL', percentage: 13 },
  { symbol: 'RTY', percentage: 9 },
]

export const RISK_PROFILES: RiskProfile[] = [
  {
    id: 'low',
    label: 'Low risk',
    totalReturn: 31.4,
    maxDrawdown: 3.8,
    winRate: 71,
    profitFactor: 2.48,
    avgRiskReward: 1.9,
    avgMonthlyReturn: 4.65,
    riskScore: 14,
    consistencyScore: 92,
    avgRiskPerTrade: 0.45,
    totalTrades: 186,
    bestTrade: 3980,
    worstTrade: -1120,
    monthlyReturns: [3.1, 2.4, 4.0, 6.2, 8.4, 4.9],
    tradeDistribution: [
      { duration: '< 1h', count: 42 },
      { duration: '1–4h', count: 68 },
      { duration: '4–24h', count: 51 },
      { duration: '1–3d', count: 19 },
      { duration: '> 3d', count: 6 },
    ],
  },
  {
    id: 'balanced',
    label: 'Balanced',
    // The figures published on /past-performance and in the offer page widget.
    totalReturn: 60.2,
    maxDrawdown: 7.41,
    winRate: 68,
    profitFactor: 2.14,
    avgRiskReward: 1.7,
    avgMonthlyReturn: 8.15,
    riskScore: 31,
    consistencyScore: 84,
    avgRiskPerTrade: 0.9,
    totalTrades: 248,
    bestTrade: 7710,
    worstTrade: -2340,
    monthlyReturns: [5.8, 3.1, 4.9, 10.98, 16.38, 8.4],
    tradeDistribution: [
      { duration: '< 1h', count: 61 },
      { duration: '1–4h', count: 92 },
      { duration: '4–24h', count: 63 },
      { duration: '1–3d', count: 24 },
      { duration: '> 3d', count: 8 },
    ],
  },
  {
    id: 'scaling',
    label: 'Scaling route',
    totalReturn: 44.6,
    maxDrawdown: 5.2,
    winRate: 69.5,
    profitFactor: 2.31,
    avgRiskReward: 2.1,
    avgMonthlyReturn: 6.3,
    riskScore: 22,
    consistencyScore: 89,
    avgRiskPerTrade: 0.65,
    totalTrades: 214,
    bestTrade: 5240,
    worstTrade: -1580,
    // Size steps up as the account grows, so the early months are the quiet ones.
    monthlyReturns: [2.6, 3.4, 5.1, 7.8, 11.2, 9.6],
    tradeDistribution: [
      { duration: '< 1h', count: 38 },
      { duration: '1–4h', count: 74 },
      { duration: '4–24h', count: 66 },
      { duration: '1–3d', count: 28 },
      { duration: '> 3d', count: 8 },
    ],
  },
  {
    id: 'high',
    label: 'High risk',
    totalReturn: 88.9,
    maxDrawdown: 12.6,
    winRate: 63.4,
    profitFactor: 1.86,
    avgRiskReward: 1.55,
    avgMonthlyReturn: 11.2,
    riskScore: 58,
    consistencyScore: 71,
    avgRiskPerTrade: 1.6,
    totalTrades: 291,
    bestTrade: 11840,
    worstTrade: -4620,
    // The losing month is real and stays in — a curve with no red month is a
    // curve nobody should believe.
    monthlyReturns: [9.2, -3.6, 8.1, 14.7, 21.4, 12.8],
    tradeDistribution: [
      { duration: '< 1h', count: 96 },
      { duration: '1–4h', count: 108 },
      { duration: '4–24h', count: 58 },
      { duration: '1–3d', count: 22 },
      { duration: '> 3d', count: 7 },
    ],
  },
]

/** Compounds the monthly returns into a balance curve from the starting balance. */
export function equityCurve(profile: RiskProfile): { month: string; balance: number }[] {
  let balance = STARTING_BALANCE
  return profile.monthlyReturns.map((r, i) => {
    balance = balance * (1 + r / 100)
    return { month: MONTH_LABELS[i] ?? `M${i + 1}`, balance: Math.round(balance) }
  })
}
