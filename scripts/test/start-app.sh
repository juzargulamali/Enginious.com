#!/usr/bin/env bash
# Build the app against the local stand-in and serve it on :3300 (production build).
set -e
cd "$(dirname "$0")/../.."
source scripts/test/env.sh
rm -rf .next
npx next build >/var/tmp/pgtest/build.log 2>&1 || { tail -30 /var/tmp/pgtest/build.log; exit 1; }
fuser -k 3300/tcp >/dev/null 2>&1 || true; sleep 0.5
NOTIFY_PROVIDER=resend RESEND_API_KEY=test-key NOTIFY_FROM=cms@example.test NOTIFY_FALLBACK_TO=staff@example.test NOTIFY_OVERRIDE_TO=authorised-test@example.test RESEND_API_URL=http://127.0.0.1:54399/emails REDIRECT_MAP_TTL_MS=1000 nohup node node_modules/next/dist/bin/next start -p 3300 >/var/tmp/pgtest/app.log 2>&1 &
sleep 4; curl -s -o /dev/null -w "app http %{http_code}\n" localhost:3300/
