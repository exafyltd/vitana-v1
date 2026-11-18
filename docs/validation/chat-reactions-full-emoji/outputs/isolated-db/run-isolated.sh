#!/usr/bin/env bash
# Starts an isolated local Postgres + PostgREST, builds the reactions schema from the
# vitana-v1 migrations, runs the given command against it, then stops everything.
# Nothing here talks to a shared or live system: Postgres listens on 127.0.0.1:54329,
# PostgREST on 127.0.0.1:54330, both inside this sandbox.
# Usage: run-isolated.sh <vitana-v1 checkout> <command...>
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
V1="$1"; shift
B="$HERE/node_modules/@embedded-postgres/linux-x64/native/bin"
AS_PG=(setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/tmp)
rm -rf "$HERE/data" "$HERE/run"; mkdir -p "$HERE/data" "$HERE/run"; chown 65534:65534 "$HERE/data" "$HERE/run"
"${AS_PG[@]}" "$B/initdb" -D "$HERE/data" -U postgres -A trust -E UTF8 --locale=C.UTF-8 > "$HERE/run/init.log" 2>&1
"${AS_PG[@]}" "$B/pg_ctl" -D "$HERE/data" -o "-p 54329 -k $HERE/run -c listen_addresses=127.0.0.1" -l "$HERE/run/pg.log" -w start > /dev/null
cleanup() {
  [ -n "${PGRST_PID:-}" ] && kill "$PGRST_PID" 2>/dev/null || true
  "${AS_PG[@]}" "$B/pg_ctl" -D "$HERE/data" -m fast stop > /dev/null 2>&1 || true
}
trap cleanup EXIT
node "$HERE/setup-db.mjs" "$V1"
export PGRST_DB_URI="postgres://authenticator:local-only@127.0.0.1:54329/isodb"
export PGRST_DB_SCHEMAS="public"
export PGRST_DB_ANON_ROLE="anon"
export PGRST_JWT_SECRET="local-isolated-test-secret-0123456789abcdef"
export PGRST_SERVER_HOST="127.0.0.1"
export PGRST_SERVER_PORT="54330"
"$HERE/postgrest" > "$HERE/run/postgrest.log" 2>&1 &
PGRST_PID=$!
for _ in $(seq 1 50); do curl -sf -o /dev/null http://127.0.0.1:54330/ && break; sleep 0.2; done
curl -sf -o /dev/null http://127.0.0.1:54330/ || { cat "$HERE/run/postgrest.log"; exit 1; }
echo "isolated stack up: postgres 127.0.0.1:54329, postgrest http://127.0.0.1:54330"
export ISODB_REST_URL="http://127.0.0.1:54330"
export ISODB_JWT_SECRET="$PGRST_JWT_SECRET"
"$@"
