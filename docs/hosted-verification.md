# Hosted verification (real Supabase + real Vercel preview)

Purpose: prove the real integration works after `docs/cms-setup.md` is complete. This is **separate from** the local stand-in tests in `docs/test-report.md`.

## Status

| Part | Status |
|---|---|
| Local stand-in tests (Postgres + API shim) | run and passed, see `docs/test-report.md` |
| Local rehearsal of the hosted script against the stand-ins | see `docs/test-report.md`; proves the script, **not** the hosted system |
| **Hosted checks against the real Supabase project and the preview** | **Done by hand by the owner on 2026-10-04** (the scripted run was not used): see "Hosted results" below. |

When you run it, paste the printed summary into the table below and commit nothing containing passwords.

## What you need
- The preview host (Vercel -> Deployments -> the `claude/milestone-2-cms` deployment).
- The administrator account from `docs/cms-setup.md` step 3 and 5.
- A second account with the **Editor** role: sign in as the administrator, Users and access -> invite a second address you control. (Needs SMTP, or use Supabase -> Authentication -> Users -> Add user, then run `insert into public.cms_roles (user_id, role, email) select id, 'editor', email from auth.users where lower(email)=lower('EDITOR@example.com');`.)
- Node 20+, `npm ci`, and Playwright's Chromium (`PLAYWRIGHT_BROWSERS_PATH`, or set `CHROMIUM_PATH`).
- Notifications **off** (`NOTIFY_PROVIDER` unset) and indexing off. The script checks both and sends no email.

## Run the automated part

```bash
HOSTED_BASE_URL=https://<preview-host> \
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' \
EDITOR_EMAIL=editor@example.com EDITOR_PASSWORD='...' \
node scripts/hosted-verify/run.cjs
```

Credentials are read from the environment only and are never printed or written. The script refuses anything except `*.vercel.app` or localhost. It writes `hosted-verify-result.json` (do not commit it) and prints PASS / FAIL / MANUAL per check. It creates records labelled `ZZ-TEST-<timestamp>` and removes them at the end (a failed run may leave them; delete anything starting `ZZ-TEST` in Admin).

| Area | Checks |
|---|---|
| Safeguards | preview is `noindex`; robots disallows all; sitemap empty; signed-out `/admin` and APIs refuse |
| Auth | wrong password rejected with a generic message; administrator signs in; logout ends the session |
| Recovery | request shows a neutral message (automatic); the email and link (MANUAL, below) |
| Workflow | draft created, not public; publish -> public 200; later draft edit not public; unpublish -> 404 |
| Media | image upload creates a record; wrong-signature file refused; signed-out upload API refuses |
| Editor permissions | Editor cannot open Users or Audit, cannot delete; can edit content and read enquiries; direct request to `/admin/users` refused |
| Enquiry | public API stores one test enquiry and returns a reference; a repeat does not duplicate; it appears in the inbox; notification status is `skipped` |
| Cleanup | test enquiry, article and media deleted |

## Manual steps (a person must do these)

**R. Password recovery end to end.**
1. Open `https://<preview-host>/admin/forgot-password`, enter the administrator email, submit.
2. Open the email. The link must point at `https://<preview-host>/admin/auth/confirm...` (the preview host, not another site).
3. Click it: you should land on "Set a new password". Choose a new 12+ character password.
4. Sign in with it. Click the old link again: the page must show the "link expired" state, not an error trace.

**I. Invitation (once SMTP is configured).** Invite an address you control as Editor; the email link opens `/admin/auth/callback`, then "set your password", then the dashboard with no Users menu.

**D. Public API cannot read drafts (optional).** With your project URL and anon key, request `<project-url>/rest/v1/content_items?select=*` using headers `apikey: <anon key>` and `Authorization: Bearer <anon key>`. It must be refused (permission denied), and `/rest/v1/enquiries` likewise. `content_published` may be read: it holds only what is live.

## Hosted results (manual, owner, 2026-10-04, commit 81c8e19)
Preview: `https://enginious-com-git-claude-milestone-2-cms-enginious.vercel.app`, project `enginious-website`. Reported by the owner; not independently reproduced by Claude.

| Check | Result |
|---|---|
| Sign in as the administrator (real Supabase Auth) | pass |
| Logout, then `/admin` redirects to login | pass |
| Password recovery email, link opens on the preview host, new password works | pass |
| Draft is not public; publish makes it public; draft edit not public; unpublish removes it; delete | pass |
| Image upload (private) with thumbnail; delete | pass |
| Editor (real second account): no Users or Audit, no permanent delete, `/admin/users` refused | pass |
| One test enquiry stored with a reference, shown in the inbox, deleted; no email sent | pass |
| Enquiry notification status label | **OPEN**: showed `pending` instead of `skipped`. The same code path gives `skipped` on the local stand-in. Not investigated yet (owner deferred). Suspects: status read before the background step finished, or the background step not completing on Vercel. To check: submit a test enquiry, wait 15 s, reload; use Retry; query `notification_last_at`; check Vercel logs. |

## Record the result

| Date | Who ran it | Preview host | Commit | Pass | Fail | Manual done | Notes |
|---|---|---|---|---|---|---|---|
| (not run yet) | | | | | | | |

Hosted results must go in this table only. Never copy a local-stand-in number here.

## If something fails
- Login works but the dashboard says the CMS is not connected: check the three Supabase variables for the **Preview** scope and redeploy.
- "Not been given CMS access": the role row is missing or the email differs from the Auth user (step 5).
- Recovery link rejected: the host is missing from Supabase Redirect URLs (step 7).
- Publish refused "still shows the built-in starter content": expected for imported types until the reviewed publishing step; the script uses articles, which are not affected.
