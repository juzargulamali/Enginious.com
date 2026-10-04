#!/usr/bin/env bash
# Create test users in the LOCAL stand-in: an administrator, an editor and an outsider (signed up, no role). Password for all: correct-horse-battery
cd "$(dirname "$0")/../.."
mk() { curl -s -X POST localhost:54321/__mock/user -d "{\"email\":\"$1\",\"password\":\"correct-horse-battery\"}" | node -e 'process.stdin.on("data",d=>process.stdout.write(JSON.parse(d).id))'; }
A=$(mk admin@test.local); E=$(mk editor@test.local); O=$(mk outsider@test.local)
P="psql -h /var/tmp/pgtest -p 54329 -U postgres -d enginious_test -q"
$P -c "insert into public.cms_roles (user_id, role, email) values ('$A','administrator','admin@test.local'), ('$E','editor','editor@test.local') on conflict do nothing"
echo "users: admin@test.local (administrator), editor@test.local (editor), outsider@test.local (no role)"
