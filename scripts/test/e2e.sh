#!/usr/bin/env bash
# Full local CMS verification: fresh test database, stand-in services, production build of the app, then the suites.
#   bash scripts/test/e2e.sh [suite...]   (default: all)
set -uo pipefail
cd "$(dirname "$0")/../.."
bash scripts/test/pg-start.sh >/dev/null
bash scripts/test/db-reset.sh >/dev/null 2>&1 || { echo "db reset failed"; exit 2; }
bash scripts/test/start-mock.sh >/dev/null
bash scripts/test/seed-users.sh >/dev/null
# Always rebuild: the app caches content (ISR), so a stale build would show data from an earlier run.
bash scripts/test/start-app.sh || exit 2
export NODE_PATH=$(npm root -g)
rc=0
for s in ${@:-admin-e2e}; do echo "== $s"; node scripts/test/$s.cjs || rc=1; done
exit $rc
