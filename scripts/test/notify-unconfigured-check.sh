#!/usr/bin/env bash
# LOCAL check: with NO notification provider configured (the hosted preview's state) a stored enquiry is marked "skipped" inside
# the request itself, never left "pending", and the visitor still gets a reference.
set -uo pipefail
cd "$(dirname "$0")/../.."
export NODE_PATH=$(npm root -g)
bash scripts/test/pg-start.sh >/dev/null 2>&1; bash scripts/test/db-reset.sh >/dev/null 2>&1 || { echo "db reset failed"; exit 2; }
bash scripts/test/start-mock.sh >/dev/null; source scripts/test/env.sh
rm -rf .next; npx next build >/var/tmp/pgtest/build.log 2>&1 || { tail -20 /var/tmp/pgtest/build.log; exit 1; }
fuser -k 3300/tcp >/dev/null 2>&1; sleep 1
env -u NOTIFY_PROVIDER -u RESEND_API_KEY -u NOTIFY_FROM -u NOTIFY_FALLBACK_TO -u NOTIFY_OVERRIDE_TO nohup node node_modules/next/dist/bin/next start -p 3300 >/var/tmp/pgtest/app.log 2>&1 &
sleep 5
P="psql -h /var/tmp/pgtest -p 54329 -U postgres -d enginious_test -At"
fails=0; check() { if [ "$2" = "1" ]; then echo "  PASS  $1"; else echo "  FAIL  $1"; fails=$((fails+1)); fi; }
R=$(curl -s -XPOST localhost:3300/api/enquiries -H 'content-type: application/json' -d "{\"submissionId\":\"$(cat /proc/sys/kernel/random/uuid)\",\"region\":\"uae\",\"name\":\"Unconfigured Test\",\"email\":\"t@example.invalid\",\"company\":\"Co\",\"country\":\"\",\"projectType\":\"event\",\"eventDate\":\"\",\"budget\":\"\",\"message\":\"no provider configured test message\",\"technologies\":[],\"website\":\"\",\"sourcePath\":\"/contact\"}")
check "the visitor gets a reference" $(echo "$R" | grep -q '"reference":"ENQ-' && echo 1 || echo 0)
ROW=$($P -c "select notification_status || '|' || coalesce(notification_error,'') || '|' || notification_attempts || '|' || (notification_last_at is not null) from enquiries order by created_at desc limit 1")   # read at once, no waiting
check "status is 'skipped' immediately (not pending)" $([ "${ROW%%|*}" = "skipped" ] && echo 1 || echo 0)
check "reason recorded, zero attempts, timestamp set" $([ "$ROW" = "skipped|Notifications are not configured.|0|t" ] && echo 1 || echo 0)
echo "failed = $fails"; [ $fails -eq 0 ]
