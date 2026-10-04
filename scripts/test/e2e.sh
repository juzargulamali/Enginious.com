#!/usr/bin/env bash
# Full local CMS verification against the LOCAL stand-ins (never a real project): for EACH suite a fresh test database and a
# fresh production build, so no suite can see another's data or the app's content cache.
#   bash scripts/test/e2e.sh [suite...]      suites: admin-e2e public-e2e auth-e2e enquiry-e2e media-e2e admin-visual
#   REUSE_BUILD=1 skips rebuilding (only safe for suites that do not depend on cached public content)
set -uo pipefail
cd "$(dirname "$0")/../.."
bash scripts/test/pg-start.sh >/dev/null
export NODE_PATH=$(npm root -g)
rc=0
for s in ${@:-admin-e2e}; do
  echo "== $s"
  bash scripts/test/db-reset.sh >/dev/null 2>&1 || { echo "db reset failed"; exit 2; }
  bash scripts/test/start-mock.sh >/dev/null
  bash scripts/test/seed-users.sh >/dev/null
  if [ "${REUSE_BUILD:-0}" = "1" ]; then
    fuser -k 3300/tcp >/dev/null 2>&1 || true; sleep 0.5; source scripts/test/env.sh
    NOTIFY_PROVIDER=resend RESEND_API_KEY=test-key NOTIFY_FROM=cms@example.test NOTIFY_FALLBACK_TO=staff@example.test NOTIFY_OVERRIDE_TO=authorised-test@example.test RESEND_API_URL=http://127.0.0.1:54399/emails REDIRECT_MAP_TTL_MS=1000 nohup node node_modules/next/dist/bin/next start -p 3300 >/var/tmp/pgtest/app.log 2>&1 &
    sleep 4
  else
    bash scripts/test/start-app.sh || exit 2
  fi
  node scripts/test/$s.cjs || rc=1
done
exit $rc
