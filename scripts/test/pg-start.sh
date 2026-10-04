#!/usr/bin/env bash
# Start (creating if needed) a LOCAL throw-away Postgres 16 for tests. Needs the postgresql-16 binaries and root (uses the postgres user).
set -euo pipefail
D=/var/tmp/pgtest
B=/usr/lib/postgresql/16/bin
mkdir -p $D && chown postgres $D
[ -d $D/data ] || su postgres -c "$B/initdb -D $D/data -A trust -U postgres >/dev/null"
pg_isready -h $D -p 54329 >/dev/null 2>&1 || su postgres -c "$B/pg_ctl -D $D/data -o '-p 54329 -k $D' -l $D/log start >/dev/null"
sleep 1; pg_isready -h $D -p 54329
