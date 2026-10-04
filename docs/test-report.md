# Milestone 2 test report

**Two kinds of result, kept apart.** Section "Hosted results" (below) comes from the real Supabase project `enginious-website` and the Vercel preview, run by hand by the owner. Every other table in this file is LOCAL stand-in output (Postgres with a mock auth/storage layer), not hosted.

## Hosted results (real Supabase + Vercel preview)
Run by the owner on 2026-10-04 against `https://enginious-com-git-claude-milestone-2-cms-enginious.vercel.app` (commit `81c8e19`, docs-only commits after it). These are the owner's reported results; Claude could not reach the hosted systems and has not reproduced them. Notifications and indexing were off.

| Hosted check | Result |
|---|---|
| Administrator sign in (real Supabase Auth, role from `cms_roles`) | passed |
| Logout; protected pages redirect to login | passed |
| Password recovery (email, link on the preview host, new password, reused link rejected) | passed |
| Draft -> publish -> unpublish (draft not public, draft edit not public, unpublish removes, delete) | passed |
| Image upload (private) with thumbnail, then delete | passed |
| Editor permissions with a real second account (no Users or Audit, no permanent delete, `/admin/users` refused) | passed |
| One stored test enquiry: reference returned, appears in inbox, deleted, no email sent | passed |
| Notification status label on that enquiry | observed `pending`, expected `skipped`; **not re-checked**; the enquiry itself was stored correctly. Open item, see `docs/hosted-verification.md` |

Not verified at all: real email notifications (provider not configured), real devices, screen readers, production URL behaviour before merge.

## Local stand-in results


All results below are from LOCAL stand-ins: a real Postgres 16 with a mock auth/storage schema, a small
PostgREST/GoTrue/Storage shim (`scripts/test/mock-supabase.cjs`) that runs queries under the real database roles
(so RLS is genuinely exercised), a fake mail server, and a production `next build` + `next start`.
Run everything with `bash scripts/test/all.sh` (one suite at a time; never run two suites at once, they share
the database and the `.next` build folder).

| Check | Result |
|---|---|
| Type check | passed |
| Lint | passed |
| Unit tests (5 files: markdown, upload signatures, redirects, indexing, consent) | passed |
| RLS / database tests (`supabase/tests/rls.test.sql`, 141 checks, incl. draft-only import and reviewed-publish rules) | passed |
| Migration guards (`scripts/test/migration-guards.sh`: rows in clients / testimonials / client_projects abort and drop nothing; missing prerequisites abort clearly; whole chain applies to an empty database) | passed, 15 checks |
| Admin e2e (auth gating, draft-only import, reviewed publish, workflows, slugs, redirects, roles) | passed, 27/27 |
| Public e2e (starter content unchanged by import, reviewed publish, draft isolation, samples excluded, SEO, redirects, sitemap) | passed, 49/49 |
| Auth e2e (login, logout, recovery, invite-only, no self-grant) | passed |
| Enquiry e2e (storage, reference, rate limit, notification failure + retry, attachments) | passed, 39/39 |
| Media e2e (signature/size/filename checks, SVG rejected, reference check before delete) | passed |
| Admin visual (desktop + mobile, keyboard) | passed, 23/23 |
| Local rehearsal of the hosted-verification script (`scripts/hosted-verify/run.cjs` against the stand-ins, mode `local-rehearsal`) | passed, 38 passed, 0 failed, 2 MANUAL (email steps) |
| Indexing safeguards (preview/production noindex, post-launch sitemap/robots/canonical) | passed, 31 checks |
| Consent gating (no analytics before consent) | passed |

## Notes on the first full run
In the first `all.sh` run, public-e2e, enquiry-e2e, admin-visual and indexing reported failures. They were
harness collisions (a concurrent rebuild deleted `.next`; a database drop was blocked by open connections), not
product defects. `db-reset.sh` now uses `drop database ... with (force)`. All four passed when rerun one at a time.

## Known test limitation
The older round-4 test "no false success when backend unavailable" assumes no backend, so it fails in CMS mode
and passes in static mode. It is not part of the Milestone 2 suite.

## Not verified
- The hosted Supabase project (migrations not applied there; the sandbox cannot reach it).
- Real email delivery (fake mail server only; no real people were emailed).
- The deployed Vercel preview behaviour (see HANDOVER.md for the preview status).
- Real devices, screen readers, malware scanning, MFA, CSP.
- Nothing was run against production.

## Run of the second round (draft-only imports, guards, hosted script)
`scripts/test/all.sh` logs: typecheck, lint, unit, db, migration-guards, admin-e2e, public-e2e, auth-e2e, enquiry-e2e, media-e2e, admin-visual, hosted-rehearsal and consent all exit 0. The indexing suite failed once because its SQL fixture published items of starter-backed types before adoption (the new database rule correctly refused); the fixture now adopts those types first and the suite passes (31 checks), rerun on its own.
