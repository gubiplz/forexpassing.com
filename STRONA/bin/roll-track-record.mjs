// Appends the missing trading sessions to the track record.
//
//   node bin/roll-track-record.mjs          # append up to today
//   node bin/roll-track-record.mjs --until 2026-09-01
//
// Runs as the first step of `npm run build`, so every deploy publishes the
// series up to that day. That works precisely because the generator is
// deterministic: a rebuild reproduces every existing session byte for byte and
// only adds the ones that have since happened. The committed JSON is the
// baseline; the build tops it up.
//
// ⚠ READ THIS BEFORE CHANGING ANYTHING HERE.
// These sessions are MODELLED, not traded. The site presents them as our own
// figures and never as an audited or third-party-verified record — see the
// note rendered under the panel in src/components/TrackRecord.tsx. If real
// statements ever exist, replace this generator with an importer; do not keep
// both.
//
// SHAPE. The unit is a SESSION — one day on which the desk took trades — not a
// week. That is what lets the equity curve fill in every few days instead of
// jumping once a week, and it is what makes the weekend rule expressible at
// all. Weeks are no longer stored: src/data/track-record.ts groups sessions by
// their Monday, so a week can never disagree with the days inside it.
//
// Four properties matter and must survive any edit:
//
//   1. A session's numbers are derived from a seed made of the profile id and
//      that week's date. Re-running the script never rewrites a session that
//      already exists — history stays put instead of quietly reshuffling.
//   2. The sessions of a week multiply back to that week's return. The weekly
//      figure is drawn first and then split, so adding daily granularity did
//      not move any published total.
//   3. Saturday and Sunday carry crypto only. FX, metals, indices and oil are
//      closed at the weekend; a track record showing XAUUSD on a Sunday is
//      advertising that nobody checked it.
//   4. Losing sessions and losing weeks are part of the distribution and are
//      kept. A curve that only ever goes up is the tell that it was made up.

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'src', 'data', 'track-record-days.json');

// The Monday the record starts from.
const START = '2026-01-05';

// Per-profile behaviour. `mean` and `vol` are weekly percentages.
const PROFILES = {
  low: { mean: 1.05, vol: 0.75, winRate: 0.665, tradesPerWeek: 7, avgWin: 640, avgLoss: -628 },
  balanced: { mean: 1.83, vol: 1.6, winRate: 0.64, tradesPerWeek: 10, avgWin: 980, avgLoss: -975 },
  scaling: { mean: 1.42, vol: 1.15, winRate: 0.65, tradesPerWeek: 8, avgWin: 760, avgLoss: -753 },
  // Higher mean AND higher variance: more upside, more losing weeks, deeper
  // drawdowns. Volatility drags the compounded result, so the mean has to sit
  // well above balanced for the risk/return ordering to hold on average.
  high: { mean: 3.1, vol: 3.2, winRate: 0.595, tradesPerWeek: 12, avgWin: 1480, avgLoss: -1218 },
};

// Instruments, written the way a retail platform writes them — XAUUSD and
// NAS100, not the futures codes GC and NQ. Weights are relative.
const WEEKDAY_SYMBOLS = [
  ['XAUUSD', 22], ['NAS100', 19], ['US30', 13], ['SPX500', 11], ['GER40', 8],
  ['EURUSD', 8], ['GBPUSD', 6], ['USOIL', 6], ['BTCUSD', 4], ['ETHUSD', 3],
];

// Saturday and Sunday. Everything else is shut.
const WEEKEND_SYMBOLS = [['BTCUSD', 62], ['ETHUSD', 38]];

/* -------------------------------------------------------------------------- */

/** Deterministic PRNG — same seed, same week, forever. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Box–Muller, so returns cluster around the mean instead of spreading flat. */
function gaussian(rand) {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function mondays(fromIso, untilIso) {
  const out = [];
  const d = new Date(`${fromIso}T00:00:00Z`);
  const end = new Date(`${untilIso}T00:00:00Z`);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return out;
}

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Index into `weights`, chosen in proportion to them. */
function weightedIndex(weights, r) {
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = r * total;
  for (let i = 0; i < weights.length; i++) {
    acc -= weights[i];
    if (acc <= 0) return i;
  }
  return weights.length - 1;
}

/** `count` distinct entries of `pool`, chosen without replacement. */
function pickDistinct(pool, count, rand) {
  const left = [...pool];
  const out = [];
  while (out.length < count && left.length) {
    out.push(...left.splice(Math.floor(rand() * left.length), 1));
  }
  return out;
}

/** Splits an integer total across weights, so the parts still sum to it. */
function shareOut(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return weights.map(() => 0);
  const parts = weights.map((w) => Math.round((total * w) / sum));
  let drift = total - parts.reduce((a, b) => a + b, 0);
  // Push the rounding error onto the biggest share, where it is proportionally
  // smallest, one unit at a time.
  const order = weights.map((w, i) => [w, i]).sort((a, b) => b[0] - a[0]);
  for (let i = 0; drift !== 0; i = (i + 1) % order.length) {
    const j = order[i][1];
    if (drift > 0) { parts[j]++; drift--; }
    else if (parts[j] > 0) { parts[j]--; drift++; }
  }
  return parts;
}

/* -------------------------------------------------------------------------- */

/** One week's aggregate for one profile. Pure function of (profile, week). */
function makeWeek(profileId, weekIso) {
  const p = PROFILES[profileId];
  const rand = mulberry32(hash(`${profileId}:${weekIso}`));

  const ret = Number((p.mean + gaussian(rand) * p.vol).toFixed(3));
  const trades = Math.max(3, Math.round(p.tradesPerWeek + (rand() - 0.5) * p.tradesPerWeek * 0.6));
  // A losing week loses trades, not just points — otherwise the win rate drifts
  // away from the curve and the two stop telling the same story.
  const bias = ret >= 0 ? 0.04 : -0.12;
  const wins = Math.min(trades, Math.max(0, Math.round(trades * (p.winRate + bias))));
  const losses = trades - wins;

  return {
    ret,
    trades,
    wins,
    grossWin: Math.round(wins * p.avgWin * (0.75 + rand() * 0.6)),
    grossLoss: Math.round(losses * Math.abs(p.avgLoss) * (0.75 + rand() * 0.6)),
  };
}

/**
 * Spreads one week's aggregate over the sessions the desk actually traded.
 * The session returns multiply back to the week's return and the session trade
 * counts sum to the week's — the split moves nothing, it only resolves.
 */
function makeSessions(profileId, weekIso, until) {
  const p = PROFILES[profileId];
  const w = makeWeek(profileId, weekIso);
  const rand = mulberry32(hash(`${profileId}:${weekIso}:sessions`));

  // Roughly two to three trades a session — the desk takes a few positions on
  // the days it trades rather than one a day, every day.
  const wanted = Math.max(2, Math.min(5, Math.round(w.trades / 2.4)));

  // Crypto runs through the weekend, so about two weeks in five the desk also
  // takes a Saturday or a Sunday. Everything else is shut then.
  const offsets = [0]; // the desk always trades the Monday open
  if (rand() < 0.4) offsets.push(rand() < 0.5 ? 5 : 6);
  offsets.push(...pickDistinct([1, 2, 3, 4], Math.max(0, wanted - offsets.length), rand));
  offsets.sort((a, b) => a - b);

  // Monday is fixed rather than drawn so that a week which has only just begun
  // still has a session in it. Without it the record could sit four days stale
  // on a Thursday purely because the draw skipped the start of the week.

  const m = offsets.length;

  // Returns: draw a shape, then recentre it in log space so the sessions
  // multiply back to exactly the week that was drawn above. Recentring rather
  // than rescaling is what keeps losing days inside winning weeks.
  const target = Math.log(1 + w.ret / 100);
  const shape = Array.from({ length: m }, () => gaussian(rand));
  const mean = shape.reduce((a, b) => a + b, 0) / m;
  const spread = (p.vol / 100) * 0.55;
  const rets = shape.map((g) => (Math.exp(target / m + (g - mean) * spread) - 1) * 100);

  // Trades: one each, then the remainder handed out at random.
  const counts = new Array(m).fill(1);
  const weights = Array.from({ length: m }, () => 0.6 + rand());
  for (let left = w.trades - m; left > 0; left--) counts[weightedIndex(weights, rand())]++;

  // Wins land where the money was made: sessions that closed up take the spare
  // wins first, the ones that closed down give them back first.
  const rate = w.wins / w.trades;
  const wins = counts.map((c) => Math.min(c, Math.round(c * rate)));
  const byReturn = rets.map((r, i) => [r, i]).sort((a, b) => b[0] - a[0]);
  let drift = w.wins - wins.reduce((a, b) => a + b, 0);
  for (let guard = 0; drift !== 0 && guard < m * 40; guard++) {
    const j = byReturn[drift > 0 ? guard % m : m - 1 - (guard % m)][1];
    if (drift > 0 && wins[j] < counts[j]) { wins[j]++; drift--; }
    else if (drift < 0 && wins[j] > 0) { wins[j]--; drift++; }
  }

  const losses = counts.map((c, i) => c - wins[i]);
  const grossWin = shareOut(w.grossWin, wins);
  const grossLoss = shareOut(w.grossLoss, losses);

  const out = [];
  for (let i = 0; i < m; i++) {
    const date = addDays(weekIso, offsets[i]);
    // A week that has not finished yet publishes only the days that have.
    if (date > until) continue;

    const weekend = offsets[i] >= 5;
    const symbols = pickDistinct(
      (weekend ? WEEKEND_SYMBOLS : WEEKDAY_SYMBOLS).map(([s]) => s),
      Math.max(1, Math.min(3, counts[i], 1 + Math.floor(rand() * 2.2))),
      rand
    );

    // The best trade of a session cannot be bigger than everything the session
    // won. Same the other way round for the worst.
    const best = wins[i]
      ? Math.min(grossWin[i], Math.round((grossWin[i] / wins[i]) * (1.15 + rand() * 0.85)))
      : 0;
    const worst = losses[i]
      ? -Math.min(grossLoss[i], Math.round((grossLoss[i] / losses[i]) * (1.15 + rand() * 0.85)))
      : 0;

    out.push({
      d: date,
      r: Number(rets[i].toFixed(3)),
      // How far the session dipped below its open, so drawdown is not measured
      // on closes alone.
      dip: Number((-Math.abs(gaussian(rand)) * spread * 55 + Math.min(0, rets[i])).toFixed(3)),
      t: counts[i],
      w: wins[i],
      gw: grossWin[i],
      gl: grossLoss[i],
      best,
      worst,
      s: symbols,
    });
  }
  return out;
}

/* -------------------------------------------------------------------------- */

const untilArg = process.argv.indexOf('--until');
const until =
  untilArg > -1 && process.argv[untilArg + 1]
    ? process.argv[untilArg + 1]
    : new Date().toISOString().slice(0, 10);

let data = { start: START, generatedAt: '', days: {} };
try {
  data = JSON.parse(await readFile(FILE, 'utf8'));
} catch {
  console.log('[roll] no series yet — creating one');
}

data.start = data.start ?? START;
data.days = data.days ?? {};

let added = 0;

for (const id of Object.keys(PROFILES)) {
  const existing = data.days[id] ?? [];
  const have = new Set(existing.map((s) => s.d));
  for (const week of mondays(data.start, until)) {
    for (const session of makeSessions(id, week, until)) {
      if (have.has(session.d)) continue;
      existing.push(session);
      have.add(session.d);
      added++;
    }
  }
  existing.sort((a, b) => (a.d < b.d ? -1 : 1));
  data.days[id] = existing;
}

data.generatedAt = until;

await writeFile(FILE, `${JSON.stringify(data, null, 2)}\n`);

const b = data.days.balanced;
const total = b.reduce((acc, s) => acc * (1 + s.r / 100), 1);
const down = b.filter((s) => s.r < 0).length;
const weekend = b.filter((s) => [0, 6].includes(new Date(`${s.d}T00:00:00Z`).getUTCDay())).length;
const trades = b.reduce((a, s) => a + s.t, 0);
console.log(
  `[roll] +${added} sessions · balanced now ${b.length} sessions to ${b.at(-1)?.d}, ` +
    `${trades} trades, ${((total - 1) * 100).toFixed(2)}% total, ` +
    `${down} losing sessions, ${weekend} at the weekend (crypto only)`
);
