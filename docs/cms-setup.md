# CMS setup (Supabase + Vercel)

Everything here is for the **dedicated Enginious** Supabase project and the `enginious-com` Vercel project only. Never use the HR Engine or personal-site projects.
Nothing in this list changes the public domain, DNS or email. Indexing and email notifications stay **off** throughout.

> Where it says "SQL editor" it means Supabase dashboard -> SQL Editor -> New query. Paste a whole file, press Run, and read the result before moving on.

## 0. Before you apply anything: what the migrations assume, and what they can destroy

The migrations are idempotent where possible, but one of them **drops tables**, so check first.

### 0.1 Earlier migrations (prerequisites)

Apply these in order, **if they are not already applied** (the Milestone 2 files refuse to run without them and say which one is missing):

| Order | File | Provides | Needed by |
|---|---|---|---|
| 1 | `20261003000000_baseline.sql` | `cms_admins`, `is_cms_admin()`, safe default grants | roles |
| 2 | `20261003010000_enquiries.sql` | `enquiries` table | enquiries v2 |
| 3 | `20261004000000_media_assets.sql` | `media_assets` table | media storage |
| 4 | `20261004010000_clients_testimonials.sql` | the empty Milestone 1 `clients`, `client_projects`, `testimonials` tables | dropped by content (see 0.2) |
| 5 | `20261005000000_cms_roles.sql` | roles, audit log | content, media, enquiries v2 |
| 6 | `20261005010000_cms_content.sql` | content engine, redirects | import review |
| 7 | `20261005020000_media_storage.sql` | media columns, four storage buckets, policies | |
| 8 | `20261005030000_enquiries_v2.sql` | notes, attachments, notification status, rate limits | |
| 9 | `20261005040000_cms_public_helpers.sql` | public helpers | import review |
| 10 | `20261006000000_import_review.sql` | draft-only imports, reviewed publish step | |

Check what is already applied: SQL editor ->
```sql
select to_regclass('public.cms_admins') as baseline, to_regclass('public.enquiries') as enquiries,
       to_regclass('public.media_assets') as media, to_regclass('public.clients') as m1_clients,
       to_regclass('public.content_items') as m2_content;
```
A non-null value means that part exists. (If you use the Supabase CLI, `supabase migration list` shows the same.)

### 0.2 The guard on `clients`, `testimonials`, `client_projects`

`20261005010000_cms_content.sql` replaces those three Milestone 1 tables with the generic content model and therefore **drops** them. The app never wrote to them, so they should be empty. The migration **aborts, changing nothing,** if any of the three contains a row:

```
ABORTED: public.clients contains 3 row(s) and this migration would drop the table. Export the data ...
```

If you see that, do not force it. Back up (0.3), review the rows, recreate the ones you want in the CMS (Admin -> Clients / Testimonials), then empty the tables deliberately (`delete from public.testimonials; delete from public.client_projects; delete from public.clients;`) and re-run the file.
The guard protects only those three tables. Run this first to see how many rows each has:

```sql
select 'clients' as t, count(*) from public.clients
union all select 'testimonials', count(*) from public.testimonials
union all select 'client_projects', count(*) from public.client_projects;
```
(If a table does not exist, this errors for that table; that is fine and means nothing to protect.)

### 0.3 Back up and export first (do this even though the project is new)

1. **Dashboard backup.** Project -> Database -> Backups. Plan features differ; if your plan has no downloadable backup, rely on 2 and 3.
2. **Table export.** For each existing table you care about (`enquiries`, `media_assets`, `cms_admins`, `clients`, `testimonials`, `client_projects`): Table editor -> open the table -> **Export** -> *Export to CSV*. Keep the CSVs somewhere private. An empty table exports a header only; that is expected.
3. **Schema + data dump with the CLI (recommended).** With the Supabase CLI logged in and linked to the Enginious project:
   ```bash
   supabase db dump --linked -f backup-schema.sql
   supabase db dump --linked --data-only -f backup-data.sql
   ```
   Store the files outside the repository. **Never commit them**: enquiries contain personal data.
4. **Storage.** If the project already has files in Storage, download them (Storage -> bucket -> select all -> Download). The Milestone 2 migration creates new buckets and never removes existing ones.

## 1. Create or choose the dedicated Supabase project

1. Supabase dashboard -> **New project** inside the Enginious organisation (or open the existing Enginious project). Name it `enginious-website`. Choose the region closest to your audience (for the Middle East and Europe, `eu-central-1` Frankfurt is a sound choice) and generate a strong database password; store it in your password manager. It is not needed by the website.
2. Wait until the project is *Healthy*. It must not be the HR Engine project and not the juzargulamali.com project.
3. Project Settings -> **API**: note the *Project URL*, the *anon public* key and the *service_role* key. You will paste them into Vercel in step 6. **The service_role key bypasses all security. Never paste it into chat, a commit, an email or a `NEXT_PUBLIC_` variable.**

## 2. Lock down sign-ups and set the password policy first

(Do this **before** creating your user, so nobody can sign themselves up in the meantime.)

1. Authentication -> **Sign In / Providers** -> **Email**: turn **off** "Allow new users to sign up". Keep "Confirm email" on. (If the toggle is absent, look under Authentication -> Settings -> "Allow new users to sign up".)
2. Turn off every other provider you do not use (leave only Email).
3. Authentication -> **Password** (or Providers -> Email): minimum length **12**.

## 3. Create your Auth user **before** assigning the administrator role

The administrator role is a row in `public.cms_roles` that points at an **existing** Auth user. If the user does not exist first, the assignment statement affects nothing. Nobody is promoted automatically and there is no default password.

1. Authentication -> **Users** -> **Add user** -> **Create new user**.
2. Enter **your own email address** and a long, unique password (a password manager's 20+ character password is ideal). Tick **Auto Confirm User**. Press **Create user**.
3. Confirm the user appears in the list with a confirmed email. Copy nothing.
4. Only now continue to step 4 (migrations) and then step 5 (assign the role).

## 4. Apply the migrations

1. Complete section 0 (prerequisites, row counts, backup).
2. In the SQL editor, run each file of the table in 0.1 that is not applied yet, **in order, one at a time**, pasting the whole file each time. After each, read the result: `Success. No rows returned` is the normal outcome. An `ABORTED: ...` message is a guard doing its job: follow its instruction and re-run that file.
3. Check afterwards:
   - Table editor: every table in `public` shows **RLS enabled**.
   - Storage: four buckets: `media` and `documents` (public), `private` and `enquiry-attachments` (private).
   - SQL editor: `select count(*) from public.content_items;` returns `0`.

## 5. Assign the administrator role

1. Open `supabase/bootstrap-admin.sql`, replace `OWNER-EMAIL@example.com` with **the email you used in step 3**, and run it in the SQL editor.
2. The final `select` must return **exactly one row** with `role = administrator` and `disabled = false`. Zero rows means the Auth user does not exist yet (go back to step 3). Nothing else in the project can ever create an administrator except an existing administrator.
3. Do **not** invite anyone yet.

## 6. Vercel environment variables (initial, safe state)

Vercel -> project `enginious-com` -> Settings -> **Environment Variables**. Scope rules and the initial values:

| Variable | Production | Preview | Development | Initial value |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | yes | yes | Project URL from step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | yes | yes | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (**Sensitive**) | yes (**Sensitive**) | no | service_role key. Mark **Sensitive**; never `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SITE_URL` | leave **unset** until launch | **never set** | no | (see below) |
| `ALLOW_INDEXING` | leave **unset** | **never set** | no | |
| `NOTIFY_PROVIDER`, `RESEND_API_KEY`, `NOTIFY_FROM`, `NOTIFY_FALLBACK_TO`, `NOTIFY_OVERRIDE_TO` | **unset** | **unset** | no | Notifications off: enquiries are stored and marked `skipped`. |
| `NEXT_PUBLIC_ANALYTICS_SRC` / `_DOMAIN` | **unset** | **unset** | no | No analytics, no consent banner. |

Why `NEXT_PUBLIC_SITE_URL` stays unset on previews: when it is set, invitation and password-reset links are built from it, so a preview's emails would point at the production site. Left unset, the links use the preview host you are on. After changing variables, **redeploy** (they apply to new deployments only).

## 7. Supabase Auth URLs for the preview

Authentication -> **URL Configuration**:

- **Site URL:** a placeholder is fine until launch; use the main Vercel project URL, for example `https://enginious-com.vercel.app` (not a domain you do not control yet). The CMS builds its own links from the host you are on; Site URL is only a fallback.
- **Redirect URLs** (add all; see `docs/environment.md` for how to confirm the real host):
  - `https://enginious-git-claude-milestone-2-cms-enginious.vercel.app/admin/auth/callback`
  - `https://enginious-git-claude-milestone-2-cms-enginious.vercel.app/admin/auth/confirm`
  - Every individual deployment gets its own hostname such as `https://enginious-ov43s1uyh-enginious.vercel.app`. To avoid adding each one, use wildcard entries:
    - `https://enginious-*-enginious.vercel.app/admin/**`
  - Later, at launch (not now): `https://<production-domain>/admin/auth/callback` and `.../admin/auth/confirm`.

The two exact paths used by the app:

| Purpose | Path | Used by |
|---|---|---|
| Invitation | `/admin/auth/callback` | invitation email -> session in the URL fragment -> "set your password" |
| Password recovery | `/admin/auth/confirm?next=/admin/set-password` | "Forgot password" email -> one-time code exchange -> "set a new password" |

**Email templates:** leave Supabase's **default** *Invite user* and *Reset password* templates for now. Custom templates that use `{{ .SiteURL }}` would send preview emails to the Site URL instead of the preview host. If you later want token-hash links, build them from `{{ .RedirectTo }}` and test them on a preview first.
**Email sending:** the built-in sender is rate-limited (a few messages an hour) and meant for testing. That is enough for the hosted checks; configure SMTP (Project Settings -> Authentication -> SMTP) before inviting the team.

## 8. First run in the admin: draft-only imports, then an explicit reviewed publish

Until you complete the reviewed step for a content type, **the public site keeps showing the built-in starter content for that type**. Importing never changes what visitors see.

1. Sign in at `/admin/login` on the preview.
2. For each type (Projects, Technologies, People, Clients, Regions, Company, Solutions, Site settings, Page search settings) open its list and press **Import starter content as drafts**. Items arrive as **drafts**; the page shows "The live site still shows the built-in starter content".
3. Open the imported items and review them: wording, facts, internal approval flags (client relationship, leadership messages), links and images. Edit what needs changing. Nothing here is public.
4. When the drafts for a type are approved, an **administrator** presses **Review and publish imported content**, ticks the confirmation and presses **Publish reviewed content**. This publishes every imported draft of that type in one all-or-nothing step and switches the live site to the CMS for that type. If any draft fails validation, nothing is published and the message names the item.
5. Until then, publishing individual items of an imported type is refused by the database ("This content type still shows the built-in starter content...").
6. Types without starter content (articles, careers, FAQs, testimonials) work immediately: items go live when published.

Import never copies the fictional sample testimonials or unapproved leadership messages.

## 9. Then
- Site settings: add confirmed social links, choose the company-profile PDF (upload it in Media first), and review the privacy-notice status.
- Regions: add the notification recipients (internal field) for each region, and the Poland contact when confirmed.
- Invite the marketing team as **Editors** (Users and access), after SMTP is configured.
- Run the hosted checks in `docs/hosted-verification.md`.

## 10. Roles

| | Administrator | Editor |
|---|---|---|
| Create, edit, preview, publish, unpublish, archive content | yes | yes |
| Media, redirects, enquiries (triage, notes, retry notification) | yes | yes |
| Delete content permanently, delete/purge enquiries | yes | no |
| Invite people, change roles, disable access, audit log | yes | no |

These limits are enforced by the database (row level security and function checks), not only by hiding buttons.

## 11. Everyday workflows

- **Draft -> publish.** Saving only changes the draft. The public page changes only when you press *Save and publish* (or *update live page*). While a published item has newer edits it shows "unpublished edits".
- **Unpublish / archive.** The item disappears from the site, the sitemap and search immediately.
- **History.** Every saved draft and every published version is kept; *Restore* puts an old version back as the new draft (the live page does not change until you publish).
- **Slug changes.** Publishing a new slug adds a 301 redirect from the old address automatically (the redirect list refreshes in the background within about a minute).
- **Order and featured.** Set in the editor or with the arrows in the list; *Apply order to live site* publishes only order/featured, not text edits.
