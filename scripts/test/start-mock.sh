#!/usr/bin/env bash
# Start the local Supabase stand-in on :54321 (after scripts/test/pg-start.sh and db-reset.sh).
cd "$(dirname "$0")/../.."
fuser -k 54321/tcp >/dev/null 2>&1; sleep 0.5
nohup node scripts/test/mock-supabase.cjs > /var/tmp/pgtest/mock.log 2>&1 &
fuser -k 54399/tcp >/dev/null 2>&1; nohup node scripts/test/fake-mail.cjs > /var/tmp/pgtest/mail.log 2>&1 &
sleep 1.5; curl -s localhost:54321/__mock/keys >/dev/null && echo "mock supabase up"
