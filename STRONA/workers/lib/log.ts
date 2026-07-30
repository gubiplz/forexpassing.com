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
}

export async function readLog(env: Env, limit = 50): Promise<LogEntry[]> {
  const raw = (await env.EDGE_LOG.get(LOG_KEY, 'json')) as LogEntry[] | null;
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, limit);
}
