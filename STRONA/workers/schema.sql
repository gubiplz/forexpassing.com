-- forexpassing-stats (D1) — durable per-hit log. One row per classification.
-- Apply:  npx wrangler d1 execute forexpassing-stats --remote --file workers/schema.sql
CREATE TABLE IF NOT EXISTS hits (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  ts             INTEGER NOT NULL,          -- epoch ms
  path           TEXT    NOT NULL,
  classification TEXT    NOT NULL,          -- human | suspicious | reviewer | bot | unknown
  country        TEXT,
  asn            INTEGER,
  as_org         TEXT,
  ua_short       TEXT,
  fbclid         INTEGER NOT NULL DEFAULT 0,
  gclid          INTEGER NOT NULL DEFAULT 0,
  ttclid         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_hits_path ON hits(path);
CREATE INDEX IF NOT EXISTS idx_hits_ts   ON hits(ts);
