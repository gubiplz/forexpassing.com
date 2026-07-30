// Edge log — rolling buffer of last 100 classifications in KV.
// Stored under EDGE_LOG.recent. Real ops would pipe to ClickHouse/BigQuery.

import type { Env, Verdict } from './types.ts';

const LOG_KEY = 'recent';
const MAX_ENTRIES = 100;

export interface LogEntry {
  ts: number;
  requestId: string;
  classification: Verdict['classification'];
  score: number;
  reasons: Array<{ code: string; detail?: string; weight: number }>;
  ctx: {
    country?: string;
    asn?: number;
    asOrg?: string;
    uaShort: string;
    path: string;
    hasFbclid: boolean;
    hasGclid: boolean;
    hasTtclid?: boolean;
  };
}

export async function appendLog(env: Env, entry: LogEntry): Promise<void> {
  try {
    const raw = (await env.EDGE_LOG.get(LOG_KEY, 'json')) as LogEntry[] | null;
    const entries = Array.isArray(raw) ? raw : [];
    entries.unshift(entry);
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    await env.EDGE_LOG.put(LOG_KEY, JSON.stringify(entries));
  } catch {
    /* best-effort */
  }

  await recordHit(env, entry);
}

// Durable per-hit record in D1 — one row per classification, never rolls off.
// KV keeps only the last 100 for quick recent-detail; D1 is the permanent log.
async function recordHit(env: Env, entry: LogEntry): Promise<void> {
  if (!env.STATS) return;
  try {
    await env.STATS.prepare(
      `INSERT INTO hits (ts, path, classification, country, asn, as_org, ua_short, fbclid, gclid, ttclid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        entry.ts,
        entry.ctx.path,
        entry.classification,
        entry.ctx.country ?? null,
        entry.ctx.asn ?? null,
        entry.ctx.asOrg ?? null,
        entry.ctx.uaShort,
        entry.ctx.hasFbclid ? 1 : 0,
        entry.ctx.hasGclid ? 1 : 0,
        entry.ctx.hasTtclid ? 1 : 0
      )
      .run();
  } catch {
    /* best-effort — a failed insert must never break request serving */
  }
}

export async function readLog(env: Env, limit = 50): Promise<LogEntry[]> {
  const raw = (await env.EDGE_LOG.get(LOG_KEY, 'json')) as LogEntry[] | null;
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, limit);
}
