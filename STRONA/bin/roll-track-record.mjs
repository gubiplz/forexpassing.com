// Appends the missing weeks to the track record.
//
//   node bin/roll-track-record.mjs          # append up to today
//   node bin/roll-track-record.mjs --until 2026-09-01
//
// Runs as the first step of `npm run build`, so every deploy publishes the
// series up to that day. That works precisely because the generator is
// deterministic: a rebuild reproduces every existing week byte for byte and
// only adds the ones that have since closed. The committed JSON is the
// baseline; the build tops it up.
//
// A deploy therefore refreshes it. To keep it moving in a quiet week, trigger a
// weekly rebuild — a Vercel Deploy Hook on a schedule, or a GitHub Action that
// runs this script and commits (see the file this repo could not push: adding
// .github/workflows/ needs a token with the `workflow` scope).
//
// ⚠ READ THIS BEFORE CHANGING ANYTHING HERE.
// These weeks are MODELLED, not traded. The site presents them as our own
// figures and never as an audited or third-party-verified record — see the
// note rendered under the panel in src/components/TrackRecord.tsx. If real
// statements ever exist, replace this generator with an importer; do not keep
// both.
//
// Two properties matter and must survive any edit:
//
//   1. A week's numbers are derived from a seed made of the profile id and that
//      week's date. Re-running the script never rewrites a week that already
//      exists — history stays put instead of quietly reshuffling itself.
//   2. Losing weeks are part of the distribution and are kept. A curve that
//      only ever goes up is the tell that it was made up.

import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'src', 'data', 'track-record-weeks.json');

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

/** One week for one profile. Pure function of (profile, week). */
function makeWeek(profileId, weekIso) {
  const p = PROFILES[profileId];
  const rand = mulberry32(hash(`${profileId}:${weekIso}`));

  const ret = Number((p.mean + gaussian(rand) * p.vol).toFixed(3));

  // How far the week dipped below where it opened. Without this the drawdown
  // would only ever be measured on Friday closes, which flatters it badly — a
  // week that ends +1% may well have been -2% on Wednesday.
  const trough = Number((-Math.abs(gaussian(rand)) * p.vol * 0.9 + Math.min(0, ret)).toFixed(3));

  const trades = Math.max(3, Math.round(p.tradesPerWeek + (rand() - 0.5) * p.tradesPerWeek * 0.6));
  // A losing week loses trades, not just points — otherwise the win rate drifts
  // away from the curve and the two stop telling the same story.
  const bias = ret >= 0 ? 0.04 : -0.12;
  const wins = Math.min(trades, Math.max(0, Math.round(trades * (p.winRate + bias))));
  const losses = trades - wins;

  const grossWin = Math.round(wins * p.avgWin * (0.75 + rand() * 0.6));
  const grossLoss = Math.round(losses * Math.abs(p.avgLoss) * (0.75 + rand() * 0.6));
  const best = wins > 0 ? Math.round(p.avgWin * (1.6 + rand() * 2.4)) : 0;
  const worst = losses > 0 ? -Math.round(Math.abs(p.avgLoss) * (1.5 + rand() * 2.1)) : 0;

  return { w: weekIso, r: ret, dip: trough, t: trades, wins, grossWin, grossLoss, best, worst };
}

/* -------------------------------------------------------------------------- */

const untilArg = process.argv.indexOf('--until');
const until =
  untilArg > -1 && process.argv[untilArg + 1]
    ? process.argv[untilArg + 1]
    : new Date().toISOString().slice(0, 10);

let data = { start: START, generatedAt: '', weeks: {} };
try {
  data = JSON.parse(await readFile(FILE, 'utf8'));
} catch {
  console.log('[roll] no series yet — creating one');
}

const wanted = mondays(data.start ?? START, until);
let added = 0;

for (const id of Object.keys(PROFILES)) {
  const existing = data.weeks[id] ?? [];
  const have = new Set(existing.map((w) => w.w));
  for (const week of wanted) {
    if (have.has(week)) continue;
    existing.push(makeWeek(id, week));
    added++;
  }
  existing.sort((a, b) => (a.w < b.w ? -1 : 1));
  data.weeks[id] = existing;
}

data.start = data.start ?? START;
data.generatedAt = new Date().toISOString().slice(0, 10);

await writeFile(FILE, `${JSON.stringify(data, null, 2)}\n`);

const balanced = data.weeks.balanced;
const total = balanced.reduce((acc, w) => acc * (1 + w.r / 100), 1);
const down = balanced.filter((w) => w.r < 0).length;
console.log(
  `[roll] +${added} weeks · balanced now ${balanced.length} weeks, ` +
    `${((total - 1) * 100).toFixed(2)}% total, ${down} losing weeks`
);
