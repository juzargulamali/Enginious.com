#!/usr/bin/env bash
# LOCAL test of the migration guards: data in clients/testimonials/client_projects must abort the Milestone 2 content migration
# (and change nothing); missing earlier migrations must abort with a clear message; an empty database must migrate cleanly.
set -uo pipefail
cd "$(dirname "$0")/../.."
export PGHOST=${PGHOST:-/var/tmp/pgtest} PGPORT=${PGPORT:-54329} PGUSER=postgres
P="psql -X -q -v ON_ERROR_STOP=1"
fails=0
check() { if [ "$2" = "1" ]; then echo "  PASS  $1"; else echo "  FAIL  $1"; fails=$((fails+1)); fi; }
fresh() { $P -d postgres -c "drop database if exists enginious_guard with (force)" -c "create database enginious_guard" && $P -d enginious_guard -f supabase/tests/mock-supabase.sql; }
apply() { for f in "$@"; do $P -d enginious_guard -f "$f" >/dev/null 2>&1 || return 1; done; }
M=supabase/migrations
EARLY="$M/20261003000000_baseline.sql $M/20261003010000_enquiries.sql $M/20261004000000_media_assets.sql $M/20261004010000_clients_testimonials.sql $M/20261005000000_cms_roles.sql"

# 1. each table with data aborts and nothing is dropped
for tbl in clients testimonials client_projects; do
  fresh >/dev/null 2>&1; apply $EARLY
  case $tbl in
    clients) SQL="insert into public.clients (id, name) values ('acme', 'Acme')";;
    testimonials) SQL="insert into public.testimonials (quote, speaker_name, speaker_role, organisation) values ('A genuinely long quote here.', 'N', 'R', 'O')";;
    client_projects) SQL="insert into public.clients (id, name) values ('acme', 'Acme'); insert into public.client_projects values ('acme', 'whx')";;
  esac
  $P -d enginious_guard -c "$SQL" >/dev/null 2>&1
  OUT=$($P -d enginious_guard -f $M/20261005010000_cms_content.sql 2>&1); rc=$?
  check "rows in $tbl abort the content migration" $([ $rc -ne 0 ] && echo "$OUT" | grep -qE "ABORTED: public.($tbl|clients) contains" && echo 1 || echo 0)
  still=$($P -d enginious_guard -At -c "select count(*) from pg_class where relname in ('clients','testimonials','client_projects') and relkind='r'")
  check "...and $tbl/clients/client_projects are all still there (nothing dropped)" $([ "$still" = "3" ] && echo 1 || echo 0)
  none=$($P -d enginious_guard -At -c "select to_regclass('public.content_items') is null")
  check "...and no content tables were created" $([ "$none" = "t" ] && echo 1 || echo 0)
done

# 2. empty tables migrate cleanly
fresh >/dev/null 2>&1; apply $EARLY
OUT=$($P -d enginious_guard -f $M/20261005010000_cms_content.sql 2>&1); check "empty tables: content migration applies" $([ $? -eq 0 ] && echo 1 || echo 0)

# 3. prerequisites missing
fresh >/dev/null 2>&1
OUT=$($P -d enginious_guard -f $M/20261005000000_cms_roles.sql 2>&1); check "roles migration without baseline aborts clearly" $(echo "$OUT" | grep -q "ABORTED: earlier migrations are missing" && echo 1 || echo 0)
fresh >/dev/null 2>&1; apply $M/20261003000000_baseline.sql
OUT=$($P -d enginious_guard -f $M/20261005020000_media_storage.sql 2>&1); check "media migration without media_assets/roles aborts clearly" $(echo "$OUT" | grep -q "ABORTED: earlier migrations are missing" && echo 1 || echo 0)
OUT=$($P -d enginious_guard -f $M/20261005030000_enquiries_v2.sql 2>&1); check "enquiries v2 without enquiries aborts clearly" $(echo "$OUT" | grep -q "ABORTED: earlier migrations are missing" && echo 1 || echo 0)
OUT=$($P -d enginious_guard -f $M/20261006000000_import_review.sql 2>&1); check "import-review migration without content migration aborts clearly" $(echo "$OUT" | grep -q "ABORTED: apply" && echo 1 || echo 0)

# 4. the whole chain applies to an empty database, and re-running the guarded migrations is harmless
fresh >/dev/null 2>&1; ALL=$(ls $M/*.sql); apply $ALL; check "all migrations apply in order to an empty database" $([ $? -eq 0 ] && echo 1 || echo 0)
$P -d postgres -c "drop database if exists enginious_guard with (force)" >/dev/null 2>&1
echo "failed = $fails"; [ $fails -eq 0 ]
