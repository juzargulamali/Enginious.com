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
if [ "${REUSE_BUILD:-0}" = "1" ]; then fuser -k 3300/tcp >/dev/null 2>&1 || true; sleep 0.5; source scripts/test/env.sh; NOTIFY_PROVIDER=resend RESEND_API_KEY=test-key NOTIFY_FROM=cms@example.test NOTIFY_FALLBACK_TO=staff@example.test NOTIFY_OVERRIDE_TO=authorised-test@example.test RESEND_API_URL=http://127.0.0.1:54399/emails REDIRECT_MAP_TTL_MS=1000 nohup node node_modules/next/dist/bin/next start -p 3300 >/var/tmp/pgtest/app.log 2>&1 & sleep 4; else bash scripts/test/start-app.sh || exit 2; fi
export NODE_PATH=$(npm root -g)
rc=0
for s in ${@:-admin-e2e}; do echo "== $s"; node scripts/test/$s.cjs || rc=1; done
exit $rc
