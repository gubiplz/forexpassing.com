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
echo "  3. CF auto-creates DNS for the subdomain"
echo ""
echo "Then test:"
echo "  curl -i https://forexpassing.com/"
echo "  curl -A 'facebookexternalhit/1.1' https://forexpassing.com/"
echo "  curl 'https://forexpassing.com/?fbclid=DEMO_001'"
