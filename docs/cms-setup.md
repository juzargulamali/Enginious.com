# CMS setup (Supabase + Vercel)

Everything here is for the **dedicated Enginious** Supabase project and the `enginious-com` Vercel project only. Never use the HR Engine or personal-site projects.
Nothing in this list changes the public domain, DNS or email.

## 1. Apply the database migrations (in order)

Run each file from `supabase/migrations/` in the Supabase **SQL editor** (or `supabase db push` if you use the CLI), oldest first. Milestone 1 files you have already run can be skipped. Milestone 2 adds:

| # | File | What it does |
|---|---|---|
| 1 | `20261005000000_cms_roles.sql` | CMS roles (administrator / editor), role functions, audit log. Existing `cms_admins` rows become administrators. |
| 2 | `20261005010000_cms_content.sql` | The content engine: drafts, published snapshots, revisions, redirects, publish/unpublish/archive functions. Drops the empty Milestone 1 `clients`/`testimonials` tables (they were never written to). |
| 3 | `20261005020000_media_storage.sql` | Media library columns, the four storage buckets (`media`, `documents`, `private`, `enquiry-attachments`) and their policies. |
| 4 | `20261005030000_enquiries_v2.sql` | Enquiry notes, attachments, notification status, persistent rate limiting, retention function. |
| 5 | `20261005040000_cms_public_helpers.sql` | Small helpers used by the public site. |

Check afterwards: Table editor -> every table in `public` shows RLS **enabled**; Storage shows the four buckets (`media` and `documents` public, the other two private).

## 2. Create the first administrator (no default password, nobody auto-promoted)

Follow the comments in `supabase/bootstrap-admin.sql`: create the owner's user in Authentication -> Users, then run the one SQL statement with that email. After that, invite everyone else from **/admin -> Users and access**.

## 3. Supabase Authentication settings

1. **Authentication -> Sign In / Providers -> Email:** turn **off** "Allow new users to sign up" (invite-only). Even if this were left on, a signed-up person gets no CMS role and sees nothing (verified by the database tests), but turn it off anyway.
2. **Authentication -> URL Configuration:** set *Site URL* to the production origin once it exists, and add these **Redirect URLs** (preview and production): `https://<preview-host>/admin/auth/callback`, `https://<preview-host>/admin/auth/confirm`, and the same two on the production domain. Invitations and password resets only work for listed URLs.
3. **Authentication -> Password:** set a minimum length of at least 12 (the CMS also enforces 12).
4. **Email templates (recommended).** Supabase's default links return the session in the URL fragment, which `/admin/auth/callback` handles. For more robust links, edit the *Invite user* and *Reset password* templates so the button points at the token-hash route:
   - Invite: `{{ .SiteURL }}/admin/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/admin/set-password`
   - Reset: `{{ .SiteURL }}/admin/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/admin/set-password`
5. **Email sending:** Supabase's built-in sender is rate-limited and meant for testing. For real invitations and resets, configure SMTP under *Project Settings -> Authentication -> SMTP*. (Not tested here: see "Not verified" in `docs/HANDOVER.md`.)

## 4. Vercel environment variables

Names and scopes are in `docs/environment.md`. Required to make the CMS work: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only, never prefixed `NEXT_PUBLIC_`), and `NEXT_PUBLIC_SITE_URL` (production origin).

## 5. First run

1. Open `/admin`, sign in as the administrator.
2. For each content type (Projects, Technologies, People, Clients, Regions, Company, Solutions, Site settings, Page search settings) open the list and press **Import starter content**. This brings the already-approved content under CMS control and publishes it, so the public site looks the same but is now edited in the CMS. Until a type is imported the public site keeps showing its built-in starter content for that type. Importing never overwrites anything already in the CMS, and never imports the fictional sample testimonials or unapproved leadership messages.
3. Site settings: add confirmed social links, choose the company-profile PDF (upload it in Media first), and review the privacy-notice status.
4. Regions: add the notification recipients (internal field) for each region, and the Poland contact when confirmed.
5. Invite the marketing team as **Editors**.

## 6. Roles

| | Administrator | Editor |
|---|---|---|
| Create, edit, preview, publish, unpublish, archive content | yes | yes |
| Media, redirects, enquiries (triage, notes, retry notification) | yes | yes |
| Delete content permanently, delete/purge enquiries | yes | no |
| Invite people, change roles, disable access, audit log | yes | no |

These limits are enforced by the database (row level security and function checks), not only by hiding buttons.

## 7. Everyday workflows

- **Draft -> publish.** Saving only changes the draft. The public page changes only when you press *Save and publish* (or *update live page*). While a published item has newer edits it shows "unpublished edits".
- **Unpublish / archive.** The item disappears from the site, the sitemap and search immediately.
- **History.** Every saved draft and every published version is kept; *Restore* puts an old version back as the new draft (the live page does not change until you publish).
- **Slug changes.** Publishing a new slug adds a 301 redirect from the old address automatically (the redirect list refreshes in the background within about a minute).
- **Order and featured.** Set in the editor or with the arrows in the list; *Apply order to live site* publishes only order/featured, not text edits.
