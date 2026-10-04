# Milestone 2 test report

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
| RLS / database tests (`supabase/tests/rls.test.sql`, 124 checks) | passed |
| Admin e2e (auth gating, workflows, drafts vs published, slugs, revisions, roles) | passed |
| Public e2e (draft isolation, samples excluded, SEO, redirects, sitemap) | passed, 42/42 |
| Auth e2e (login, logout, recovery, invite-only, no self-grant) | passed |
| Enquiry e2e (storage, reference, rate limit, notification failure + retry, attachments) | passed, 39/39 |
| Media e2e (signature/size/filename checks, SVG rejected, reference check before delete) | passed |
| Admin visual (desktop + mobile, keyboard) | passed, 23/23 |
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
