#!/usr/bin/env bash
# Cross-client reactions check: mobile adds 🍎 -> reload -> web sees it and removes it
# (plus legacy heart and cap) -> mobile reload confirms. Runs inside run-isolated.sh.
set -euo pipefail
V1="$1"
HERE="$(cd "$(dirname "$0")" && pwd)"
sign() { node -e "console.log(require('$HERE/node_modules/jsonwebtoken').sign({sub:process.argv[1],role:'authenticated',aud:'authenticated'}, process.env.ISODB_JWT_SECRET,{expiresIn:'1h'}))" "$1"; }
export ISODB_JWT_ALICE="$(sign 11111111-1111-4111-8111-111111111111)"
export ISODB_JWT_BOB="$(sign 22222222-2222-4222-8222-222222222222)"
T_MOBILE=tests/inbox-chat/conversation-chat/reactions-cross-client.isolated.test.tsx
T_WEB=src/lib/reactions/reactions-cross-client.isolated.test.tsx
echo "== step 1: mobile adds an emoji outside the six shortcuts, reload"
(cd "$V1/apps/mobile" && ISODB_STEP=mobile-add npx jest "$T_MOBILE" --verbose 2>&1)
echo "== step 2: web shows it and removes it; legacy heart; cap"
(cd "$V1" && ISODB_STEP=web npx vitest run "$T_WEB" --reporter=verbose 2>&1)
echo "== step 3: mobile reload after the web removal"
(cd "$V1/apps/mobile" && ISODB_STEP=mobile-verify npx jest "$T_MOBILE" --verbose 2>&1)
echo "== final rows in the isolated database"
curl -s -H "Authorization: Bearer $ISODB_JWT_ALICE" "$ISODB_REST_URL/message_reactions?select=user_id,emoji&order=created_at"
echo
