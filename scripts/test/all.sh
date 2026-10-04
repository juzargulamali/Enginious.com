#!/usr/bin/env bash
# Runs every check for Milestone 2 and writes one log per check to $1 (default /tmp/claude-0/final). Takes about 30 minutes.
cd "$(dirname "$0")/../.."
O=${1:-/tmp/claude-0/final}; mkdir -p "$O"
run() { n=$1; shift; echo "== $n"; ( "$@" ) > "$O/$n.log" 2>&1; echo "$n exit=$?" | tee -a "$O/summary.txt"; }
: > "$O/summary.txt"
run typecheck npx tsc --noEmit
run lint npx eslint src
run unit npm test
run db bash scripts/test/rls.sh
run migration-guards bash scripts/test/migration-guards.sh
for s in admin-e2e public-e2e auth-e2e enquiry-e2e media-e2e admin-visual hosted-rehearsal; do run $s bash scripts/test/e2e.sh $s; done
run indexing bash scripts/test/indexing-check.sh
run consent bash scripts/test/consent-check.sh
run notify-unconfigured bash scripts/test/notify-unconfigured-check.sh
echo ALLDONE >> "$O/summary.txt"
