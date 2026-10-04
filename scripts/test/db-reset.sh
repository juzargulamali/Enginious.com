#!/usr/bin/env bash
# Recreate the LOCAL test database from the migrations (needs the local Postgres from scripts/test/pg-start.sh).
set -euo pipefail
cd "$(dirname "$0")/../.."
P="psql -h ${PGHOST:-/var/tmp/pgtest} -p ${PGPORT:-54329} -U postgres -v ON_ERROR_STOP=1 -q"
$P -d postgres -c "drop database if exists enginious_test with (force)" -c "create database enginious_test"
export PGDATABASE=enginious_test
$P -d enginious_test -f supabase/tests/mock-supabase.sql
for f in supabase/migrations/*.sql; do echo "applying $f"; $P -d enginious_test -f "$f"; done
echo "db ready"
