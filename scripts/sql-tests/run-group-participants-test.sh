#!/usr/bin/env bash
# VTID-04955: runs the group participant policy test against a throwaway database.
# Needs PG* env vars (or a local socket) pointing at a disposable Postgres.
# Refuses to run against anything that looks like Supabase or Aurora.
set -euo pipefail
case "${PGHOST:-local}" in
  *supabase*|*amazonaws*|*rds*) echo "refusing: PGHOST=${PGHOST} is not a throwaway database" >&2; exit 2 ;;
esac
cd "$(dirname "$0")"
db="group_participants_test_$$"
createdb "$db"
trap 'dropdb --if-exists "$db"' EXIT
psql -X -q -v ON_ERROR_STOP=1 -d "$db" -f vtid-04955-group-participants.test.sql
