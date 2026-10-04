#!/usr/bin/env bash
# Run the LOCAL database security tests. Exit code 1 if any check fails.
set -uo pipefail
cd "$(dirname "$0")/../.."
bash scripts/test/db-reset.sh >/dev/null 2>&1 || { echo "db reset failed"; exit 2; }
OUT=$(psql -h "${PGHOST:-/var/tmp/pgtest}" -p "${PGPORT:-54329}" -U postgres -d enginious_test -X -q -A -F '|' -f supabase/tests/rls.test.sql 2>&1)
echo "$OUT" | grep -E "^(PASS|FAIL)\|" | sed 's/^PASS|/  PASS  /; s/^FAIL|/  FAIL  /; s/|/  /g'
echo "$OUT" | grep -E "^ERROR|psql:" | head -5
SUMMARY=$(echo "$OUT" | grep -E "^[0-9]+\|[0-9]+$" | tail -1)
echo "passed|failed = $SUMMARY"
[[ "$SUMMARY" == *"|0" ]]
