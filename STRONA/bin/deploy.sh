#!/usr/bin/env bash
# Production deploy script for forexpassing-edge Worker.
# Run from apps/ebook/ root. Requires: wrangler logged in + .dev.vars present.

set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> 1. Production build"
npm run build

echo ""
echo "==> 2. Verify wrangler login"
npx wrangler whoami

echo ""
echo "==> 3. Create KV namespaces (idempotent — skips if already exist)"
KV_USED_CLICKS_OUT=$(npx wrangler kv namespace create USED_CLICKS 2>&1 || true)
echo "$KV_USED_CLICKS_OUT"
KV_USED_CLICKS_ID=$(echo "$KV_USED_CLICKS_OUT" | grep -oE 'id = "[a-f0-9]+"' | head -1 | cut -d'"' -f2 || echo "")

KV_EDGE_LOG_OUT=$(npx wrangler kv namespace create EDGE_LOG 2>&1 || true)
echo "$KV_EDGE_LOG_OUT"
KV_EDGE_LOG_ID=$(echo "$KV_EDGE_LOG_OUT" | grep -oE 'id = "[a-f0-9]+"' | head -1 | cut -d'"' -f2 || echo "")

if [ -n "$KV_USED_CLICKS_ID" ] && [ -n "$KV_EDGE_LOG_ID" ]; then
  echo ""
  echo "  USED_CLICKS id: $KV_USED_CLICKS_ID"
  echo "  EDGE_LOG    id: $KV_EDGE_LOG_ID"
  echo ""
  echo "==> 4. Patching workers/wrangler.toml with real IDs"
  sed -i.bak \
    -e "s|id = \"local-used-clicks\"|id = \"$KV_USED_CLICKS_ID\"|" \
    -e "s|id = \"local-edge-log\"|id = \"$KV_EDGE_LOG_ID\"|" \
    workers/wrangler.toml
  rm workers/wrangler.toml.bak
  echo "  wrangler.toml updated"
else
  echo "  KV IDs already configured in wrangler.toml (skipping patch)"
fi

echo ""
echo "==> 5. Set EDGE_SECRET as Worker secret"
if [ -f workers/.dev.vars ]; then
  SECRET=$(grep '^EDGE_SECRET=' workers/.dev.vars | cut -d'=' -f2-)
  echo "$SECRET" | npx wrangler secret put EDGE_SECRET --config workers/wrangler.toml
else
  echo "  ERROR: workers/.dev.vars not found. Run: cp workers/.dev.vars.example workers/.dev.vars"
  exit 1
fi

echo ""
echo "==> 6. Deploy Worker"
npx wrangler deploy --config workers/wrangler.toml

echo ""
echo "==> 7. Done."
echo ""
echo "Next steps (manual, in CF dashboard):"
echo "  1. Workers & Pages → forexpassing-edge → Settings → Triggers"
echo "  2. 'Add Custom Domain' → forexpassing.com"
echo "  3. CF auto-creates the DNS record for the domain"
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
