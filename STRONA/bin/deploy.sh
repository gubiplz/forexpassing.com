#!/usr/bin/env bash
# Production deploy script for the forexpassing-edge Worker.
# Run from anywhere. Requires: wrangler logged in + workers/.dev.vars present.

set -euo pipefail

cd "$(dirname "$0")/.."

# The tracked wrangler.toml carries KV placeholders on purpose (public repo). Real
# IDs are patched in for the upload and restored afterwards, on success or failure.
restore_placeholders() {
  if [ -f workers/wrangler.toml.deploy-bak ]; then
    mv workers/wrangler.toml.deploy-bak workers/wrangler.toml
  fi
}
trap restore_placeholders EXIT

echo "==> 1. Production build"
npm run build

echo ""
echo "==> 2. Verify wrangler login"
npx wrangler whoami

echo ""
echo "==> 3. Resolve KV namespaces (reuse existing, create if missing)"
# `kv namespace create` errors out when the namespace is already there and prints
# no id, so resolve from the list first — that is what makes re-runs work.
kv_id() {
  local title="$1" id
  id=$(npx wrangler kv namespace list 2>/dev/null |
    python3 -c "import json,sys;print(next((n['id'] for n in json.load(sys.stdin) if n['title']=='$title'),''))")
  if [ -z "$id" ]; then
    id=$(npx wrangler kv namespace create "$title" 2>&1 |
      grep -oE '"id": *"[a-f0-9]+"' | head -1 | cut -d'"' -f4)
  fi
  printf '%s' "$id"
}

KV_USED_CLICKS_ID=$(kv_id USED_CLICKS)
KV_EDGE_LOG_ID=$(kv_id EDGE_LOG)

# Same idea for D1. The schema is NOT applied here — creating a table is a one-off,
# and running it on every deploy would hide a rename behind a silent CREATE.
#   npx wrangler d1 execute forexpassing-stats --remote --file workers/schema.sql
d1_id() {
  local name="$1"
  npx wrangler d1 list --json 2>/dev/null |
    python3 -c "import json,sys;print(next((d['uuid'] for d in json.load(sys.stdin) if d['name']=='$name'),''))"
}

D1_STATS_ID=$(d1_id forexpassing-stats)

if [ -z "$KV_USED_CLICKS_ID" ] || [ -z "$KV_EDGE_LOG_ID" ]; then
  echo "  ERROR: could not resolve KV namespace IDs" >&2
  exit 1
fi

if [ -z "$D1_STATS_ID" ]; then
  echo "  ERROR: D1 'forexpassing-stats' not found. Create it once, then apply the schema:" >&2
  echo "    npx wrangler d1 create forexpassing-stats" >&2
  echo "    npx wrangler d1 execute forexpassing-stats --remote --file workers/schema.sql" >&2
  exit 1
fi

echo "  USED_CLICKS id: $KV_USED_CLICKS_ID"
echo "  EDGE_LOG    id: $KV_EDGE_LOG_ID"
echo "  STATS (D1)  id: $D1_STATS_ID"
echo ""
echo "==> 4. Patching workers/wrangler.toml with real IDs"
cp workers/wrangler.toml workers/wrangler.toml.deploy-bak
sed -i.bak \
  -e "s|id = \"local-used-clicks\"|id = \"$KV_USED_CLICKS_ID\"|" \
  -e "s|id = \"local-edge-log\"|id = \"$KV_EDGE_LOG_ID\"|" \
  -e "s|database_id = \"local-stats-db\"|database_id = \"$D1_STATS_ID\"|" \
  workers/wrangler.toml
rm -f workers/wrangler.toml.bak
echo "  wrangler.toml updated (placeholders restored on exit)"

echo ""
echo "==> 5. Upload Worker secrets from workers/.dev.vars"
if [ ! -f workers/.dev.vars ]; then
  echo "  ERROR: workers/.dev.vars not found. Run: cp workers/.dev.vars.example workers/.dev.vars"
  exit 1
fi

put_secret() {
  local name="$1" value
  value=$(grep "^$name=" workers/.dev.vars | cut -d'=' -f2-)
  if [ -z "$value" ]; then
    echo "  $name absent from .dev.vars — skipped"
    return
  fi
  printf '%s' "$value" | npx wrangler secret put "$name" --config workers/wrangler.toml
}

put_secret EDGE_SECRET
# Shared with the Vercel env var of the same name. Optional: while the origin has
# no ORIGIN_KEY set, its middleware stays a no-op and this changes nothing.
put_secret ORIGIN_KEY

echo ""
echo "==> 6. Deploy Worker"
npx wrangler deploy --config workers/wrangler.toml

echo ""
echo "==> 7. Done."
echo ""
echo "Routes come from wrangler.toml — nothing to click in the dashboard. Do NOT"
echo "add a Custom Domain: it rewrites the zone's DNS records, and those have to"
echo "keep pointing at the Vercel origin for the Worker to have anything to proxy."
echo ""
echo "Then test."
echo ""
echo "Bots & crawlers ALWAYS get the safe page — bare curl's UA matches ^curl/,"
echo "scores -100, and is an instant hard-bot verdict (no headers can save it):"
echo "  curl -i https://forexpassing.com/"
echo "  curl -A 'facebookexternalhit/1.1' https://forexpassing.com/"
echo ""
echo "Real ad click → money page. It needs a believable browser identity: a real"
echo "User-Agent AND the Sec-Ch-Ua client hints Chrome always sends (a Chrome UA"
echo "with no Sec-Ch-Ua = -50; no Accept-Language = -40). A fresh fbclid adds +60:"
echo "  curl -i 'https://forexpassing.com/?fbclid=DEMO_001' \\"
echo "    -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' \\"
echo "    -H 'Sec-Ch-Ua: \"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"' \\"
echo "    -H 'Sec-Ch-Ua-Mobile: ?0' \\"
echo "    -H 'Sec-Ch-Ua-Platform: \"macOS\"' \\"
echo "    -H 'Accept-Language: en-US,en;q=0.9'"
echo ""
echo "Defender's note: a naive 'curl | grep' crawl only ever sees the clean safe"
echo "page. To catch the cloak a scanner must send a request indistinguishable from"
echo "a browser — and even then curl's TLS fingerprint + header order still leak it"
echo "(header_order_atypical), so a faithful audit drives a real headless browser"
echo "with consistent client hints, not curl."
