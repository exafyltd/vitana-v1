#!/usr/bin/env bash
# VTID-04989 — post-deploy check: a rollout can never leave a page blank.
#
#   scripts/ci/verify-rollout-guarantees.sh <base-url> <probe-tag>
#
# Read-only GETs of public files, no sign-in. Checks:
#   1. the page loads /boot-recover.js before its /assets/index-*.js entry;
#   2. /boot-recover.js is served as JavaScript (never the SPA fallback);
#   3. a missing /assets/ file is a 404 marked no-store, and Cloudflare does
#      not answer a second request for it from cache.
# Any failure prints ::error:: and exits non-zero.
set -euo pipefail

BASE="${1:?base url}"; BASE="${BASE%/}"
TAG="${2:-manual}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
FAIL=0
err() { echo "::error::$*"; FAIL=1; }

# 1 — script order in the served (built) HTML
code=$(curl -s -o "$TMP/index.html" -w '%{http_code}' "$BASE/?rollout-check=$TAG" || echo 000)
if [ "$code" != "200" ]; then
  err "$BASE/ answered $code"
else
  rec=$(grep -bo '/boot-recover.js' "$TMP/index.html" | head -1 | cut -d: -f1 || true)
  ent=$(grep -boE '/assets/index-[A-Za-z0-9_-]+\.js' "$TMP/index.html" | head -1 | cut -d: -f1 || true)
  if [ -z "$rec" ]; then err "$BASE/ does not load /boot-recover.js"
  elif [ -z "$ent" ]; then err "$BASE/ has no /assets/index-*.js entry"
  elif [ "$rec" -ge "$ent" ]; then err "/boot-recover.js (offset $rec) comes after the entry bundle (offset $ent)"
  else echo "✓ /boot-recover.js is loaded before the entry bundle"; fi
fi

# 2 — the recovery script itself
code=$(curl -s -D "$TMP/br.h" -o "$TMP/br.js" -w '%{http_code}' "$BASE/boot-recover.js" || echo 000)
ctype=$(grep -i '^content-type:' "$TMP/br.h" | tr -d '\r' | head -1 || true)
if [ "$code" != "200" ]; then err "/boot-recover.js answered $code"
elif ! echo "$ctype" | grep -qi javascript; then err "/boot-recover.js served as '$ctype' (SPA fallback?)"
elif ! grep -q 'VTID-04989' "$TMP/br.js"; then err "/boot-recover.js does not contain its marker"
else echo "✓ /boot-recover.js served as JavaScript"; fi

# 3 — a missing asset is never cached
MISSING="/assets/rollout-probe-${TAG}-$$-$RANDOM.js"
for n in 1 2; do
  code=$(curl -s -D "$TMP/m$n.h" -o /dev/null -w '%{http_code}' "$BASE$MISSING" || echo 000)
  cc=$(grep -i '^cache-control:' "$TMP/m$n.h" | tr -d '\r' | head -1 || true)
  cf=$(grep -i '^cf-cache-status:' "$TMP/m$n.h" | tr -d '\r' | awk '{print $2}' | head -1 || true)
  echo "  missing asset request $n: HTTP $code, ${cc:-no cache-control}, cf-cache-status=${cf:-none}"
  [ "$code" = "404" ] || err "missing asset request $n answered $code, expected 404"
  echo "$cc" | grep -qi 'no-store' || err "missing asset request $n is cacheable (${cc:-no cache-control})"
  if [ "$n" = "2" ] && [ "$(echo "$cf" | tr '[:lower:]' '[:upper:]')" = "HIT" ]; then
    err "the CDN answered the second request for a missing asset from cache (cf-cache-status: HIT)"
  fi
  sleep 2
done
[ "$FAIL" = "0" ] && echo "✓ a missing /assets/ file is a 404 that is never cached"

exit "$FAIL"
