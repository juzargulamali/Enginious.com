#!/usr/bin/env bash
# Verifies the indexing safeguards and production-mode behaviour by building the app under several environments.
# Needs the local stand-ins (scripts/test/e2e.sh starts them). Prints PASS/FAIL per check; exits 1 on any failure.
set -uo pipefail
cd "$(dirname "$0")/../.."
bash scripts/test/pg-start.sh >/dev/null; bash scripts/test/db-reset.sh >/dev/null 2>&1; bash scripts/test/start-mock.sh >/dev/null; bash scripts/test/seed-users.sh >/dev/null
source scripts/test/env.sh
PSQL="psql -h /var/tmp/pgtest -p 54329 -U postgres -d enginious_test -q -At"
EID=$($PSQL -c "select id from auth.users where email='editor@test.local'")
as_editor() { $PSQL -c "begin; set local role authenticated; select set_config('request.jwt.claims', '{\"sub\":\"$EID\",\"role\":\"authenticated\"}', true); $1; commit;" >/dev/null; }
# published: a case study, a detailed technology, an article, a hidden-from-search article; unpublished: a project; a real testimonial; fictional sample (cannot publish)
as_editor "insert into content_items (type, slug, title, draft) values
 ('project','alpha-case','Alpha Case','{\"summary\":\"A published case study.\",\"case_study\":true}'),
 ('project','beta-draft','Beta Draft','{\"summary\":\"Never published.\"}'),
 ('technology','gamma-tech','Gamma Tech','{\"summary\":\"A technology.\",\"category\":\"kinetic\",\"detailed\":true}'),
 ('article','delta-story','Delta Story','{\"excerpt\":\"e\",\"body\":\"Body text.\"}'),
 ('article','hidden-story','Hidden Story','{\"excerpt\":\"e\",\"body\":\"Body text.\",\"seo_noindex\":true}'),
 ('testimonial','real-quote','Real Quote','{\"quote\":\"A real approved quote about the work.\",\"speaker_name\":\"Real Person\",\"speaker_role\":\"Director\",\"organisation\":\"Real Org\",\"_permission_confirmed\":true}')"
# the starter-backed types used below must be adopted before the database lets individual items be published (see docs/cms-setup.md section 8)
$PSQL -c "insert into public.cms_type_adoption (type) values ('project'), ('technology') on conflict do nothing" >/dev/null
as_editor "select cms_publish(id) from content_items where slug in ('alpha-case','gamma-tech','delta-story','hidden-story','real-quote')"
rc=0
ck() { if eval "$2"; then echo "  PASS $1"; else echo "  FAIL $1"; rc=1; fi; }
start() { # $1 = env assignments for BUILD and RUN
  fuser -k 3301/tcp >/dev/null 2>&1; sleep 0.5; rm -rf .next
  env $1 npx next build >/var/tmp/pgtest/idx-build.log 2>&1 || { tail -20 /var/tmp/pgtest/idx-build.log; return 1; }
  (env $1 nohup node node_modules/next/dist/bin/next start -p 3301 >/var/tmp/pgtest/idx-app.log 2>&1 &); sleep 4
}
H() { curl -s -D - -o /dev/null "localhost:3301$1"; }
B() { curl -s "localhost:3301$1"; }

echo "== A. production deployment, indexing NOT enabled (the state until launch)"
start "VERCEL_ENV=production NEXT_PUBLIC_SITE_URL=https://www.example-public.test"
ck "home sends X-Robots-Tag noindex" "H / | grep -qi 'x-robots-tag: noindex'"
ck "home has <meta robots noindex>" "B / | grep -q '<meta name=\"robots\" content=\"noindex'"
ck "robots.txt disallows everything" "B /robots.txt | grep -q 'Disallow: /' && ! B /robots.txt | grep -qi '^Allow'"
ck "sitemap is empty" "! B /sitemap.xml | grep -q '<loc>'"
ck "the CMS-published real testimonial is shown" "B / | grep -q 'Real Org'"
ck "NO fictional sample text anywhere in the page or its data (even with ?samples=1)" "! curl -s 'localhost:3301/?samples=1' | grep -qiE 'Alex Sample|Sample Organisation|Sample · fictional'"
ck "sample text is not in any client JavaScript either" "! grep -rqE 'Alex Sample|Sample Organisation' .next/static"
ck "admin pages send noindex and no-store" "H /admin/login | grep -qi 'x-robots-tag: noindex' && H /admin/login | grep -qi 'cache-control: no-store'"
ck "the API is noindex" "H /api/enquiries | grep -qi 'x-robots-tag: noindex'"
ck "unpublished project is not in the data (404)" "[ \"\$(curl -s -o /dev/null -w '%{http_code}' localhost:3301/work/beta-draft)\" = 404 ]"

echo "== B. preview deployment WITH ALLOW_INDEXING=true (a stray variable must not matter)"
start "VERCEL_ENV=preview ALLOW_INDEXING=true NEXT_PUBLIC_SITE_URL=https://www.example-public.test"
ck "preview stays noindex (header)" "H / | grep -qi 'x-robots-tag: noindex'"
ck "preview stays noindex (meta)" "B / | grep -q '<meta name=\"robots\" content=\"noindex'"
ck "preview robots.txt disallows everything" "B /robots.txt | grep -q 'Disallow: /'"
ck "preview sitemap is empty (no preview hostname advertised)" "! B /sitemap.xml | grep -q '<loc>'"

echo "== C. production with ALLOW_INDEXING=true but NO public origin (or a vercel.app one)"
start "VERCEL_ENV=production ALLOW_INDEXING=true"
ck "no configured public origin => still noindex" "H / | grep -qi 'x-robots-tag: noindex' && B /robots.txt | grep -q 'Disallow: /'"
start "VERCEL_ENV=production ALLOW_INDEXING=true NEXT_PUBLIC_SITE_URL=https://enginious-com.vercel.app"
ck "a vercel.app origin => still noindex" "H / | grep -qi 'x-robots-tag: noindex' && ! B /sitemap.xml | grep -q '<loc>'"

echo "== D. launched: production, ALLOW_INDEXING=true, real public origin"
start "VERCEL_ENV=production ALLOW_INDEXING=true NEXT_PUBLIC_SITE_URL=https://www.example-public.test"
ck "public pages are no longer noindex" "! H / | grep -qi 'x-robots-tag: noindex' && ! B / | grep -q '<meta name=\"robots\" content=\"noindex'"
ck "robots.txt allows crawling, lists the sitemap on the PUBLIC origin" "B /robots.txt | grep -q 'Allow: /' && B /robots.txt | grep -q 'Sitemap: https://www.example-public.test/sitemap.xml'"
ck "robots.txt still disallows /admin and /api" "B /robots.txt | grep -q 'Disallow: /admin' && B /robots.txt | grep -q 'Disallow: /api'"
ck "admin stays noindex after launch" "H /admin/login | grep -qi 'x-robots-tag: noindex'"
ck "API stays noindex after launch" "H /api/enquiries | grep -qi 'x-robots-tag: noindex'"
ck "sitemap URLs use the public domain only" "B /sitemap.xml | grep -q 'https://www.example-public.test/work/alpha-case' && ! B /sitemap.xml | grep -qE 'vercel\\.app|localhost'"
ck "sitemap includes published technology and article pages" "B /sitemap.xml | grep -q '/technologies/gamma-tech' && B /sitemap.xml | grep -q '/insights/delta-story'"
ck "sitemap excludes unpublished content" "! B /sitemap.xml | grep -q 'beta-draft'"
ck "sitemap excludes pages marked hide-from-search" "! B /sitemap.xml | grep -q 'hidden-story'"
ck "the hidden article page itself is noindex" "B /insights/hidden-story | grep -q '<meta name=\"robots\" content=\"noindex'"
ck "sitemap excludes the privacy page and admin" "! B /sitemap.xml | grep -qE '/privacy|/admin'"
ck "canonical URLs use the public domain" "B /work/alpha-case | grep -q '<link rel=\"canonical\" href=\"https://www.example-public.test/work/alpha-case\"'"
ck "structured data URL uses the public domain" "B / | grep -q '\"url\":\"https://www.example-public.test\"'"
ck "structured data has no ratings or reviews" "! B / | grep -qiE 'aggregateRating|\"@type\":\"Review\"'"
ck "unknown pages are 404 and noindex" "[ \"\$(curl -s -o /dev/null -w '%{http_code}' localhost:3301/nope)\" = 404 ] && B /nope | grep -q 'noindex'"

fuser -k 3301/tcp >/dev/null 2>&1
exit $rc
