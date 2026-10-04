# Handover (Milestone 2): read this first

Branch `claude/milestone-2-cms` (from `main` at `ef781a9`, Milestone 1). Not merged. Public domain, DNS and email untouched. Indexing off everywhere.

## What now exists
- **CMS at `/admin`** (invite-only, Administrator and Editor roles): dashboard, 13 content types, draft/preview/publish/unpublish/archive, revision history, slug collision checks and automatic redirects, ordering and featured, media library, enquiry inbox, redirects, users and access, audit log. Walkthrough: `docs/cms-setup.md`.
- **Public site powered by the CMS**, with the built-in starter content as fallback for any type not yet imported (`src/lib/content/`).
- **Enquiries end to end** with private attachments, persistent rate limiting, notification adapter and retry, retention tools.
- **SEO infrastructure** with strict indexing safeguards; consent-gated analytics integration point; i18n plan.
- **Verification**: `docs/test-report.md`. Everything was tested against local stand-ins for Supabase and email (see below).

## Where things are
| Area | Files |
|---|---|
| Database | `supabase/migrations/20261005*.sql`, `supabase/bootstrap-admin.sql`, tests `supabase/tests/rls.test.sql` |
| Content model | `src/lib/cms/schema.ts` (fields, validation), `src/lib/content/{seed,assemble,load,lean}.ts` |
| Admin UI | `src/app/(admin)/admin/**`, `src/components/admin/**`, actions in `src/app/(admin)/admin/actions/` |
| Auth | `src/proxy.ts`, `src/lib/cms/auth.ts`, `src/lib/supabase/server.ts` |
| Public pages | `src/app/(site)/**`, shell `src/components/SiteShell.tsx`, client data `src/components/ContentProvider.tsx` |
| Enquiries | `src/app/api/enquiries/**`, `src/lib/{enquiry,rate-limit,enquiry-notify}.ts`, `src/lib/notify/` |
| Media | `src/app/api/admin/media/route.ts`, `src/lib/cms/media-process.ts`, `src/lib/{upload,media}.ts`, `src/components/Photo.tsx` |
| SEO | `src/lib/seo/*`, `src/app/{sitemap,robots}.ts`, `next.config.ts` headers |
| Test harness | `scripts/test/*` |

## Key decisions (all reversible)
1. **One generic content engine** (`content_items` draft + `content_published` snapshot + revisions) instead of 13 tables: new fields are a schema edit, not a migration. Internal fields start with `_` and are stripped by the database.
2. **The CMS acts as the signed-in user** (RLS enforces permissions). The service key is used only after a role check, or to store enquiries.
3. **Starter content fallback per type**: the public site never depends on the CMS being populated. After import the CMS is authoritative (unpublishing never brings starter content back).
4. **Edits go live on publish** (including order/featured); `Apply order to live site` publishes order only.
5. **Uploads are limited to 4 MB** (hosting request cap). Larger files/video need a signed direct-to-storage flow (backlog).
6. **Regions page template replaced the hand-built Europe page** with a shared `RegionPage` (UAE and Saudi Arabia were placeholders). Check the design.

## Local test stand-ins (read before trusting any result)
Docker and the Supabase CLI are not available in the build sandbox, so verification uses: a real local Postgres 16 with mocked `auth`/`storage` schemas (`supabase/tests/mock-supabase.sql`), a small Node server that speaks the subset of PostgREST/GoTrue/Storage the app uses and runs every query with the caller's real role and claims so **row level security is real** (`scripts/test/mock-supabase.cjs`), and a fake email provider. **Not verified**: the hosted Supabase project (real GoTrue emails, SMTP, real Storage behaviour, real PostgREST), a real email provider, the deployed Vercel preview from a browser (the sandbox cannot open `*.vercel.app`), real devices.

## Known limitations / follow-ups
- Browser back/forward is not guarded for unsaved edits (close, reload and in-app links are).
- Redirects take up to about a minute to apply after a change (background refresh).
- PDF "active content" screening is best-effort (see `docs/security.md`).
- No Content-Security-Policy, MFA, or malware scanning yet.
- `RESEND_API_URL`/`NOTIFY_OUTBOX_FILE` are test hooks only.
- Performance of the home page hero/tower was not changed in this milestone (see `docs/performance.md`); public bundles were not enlarged (admin code is route-isolated).

## Owner actions (short list)
See the final report and `LAUNCH.md`: apply 5 migrations; create first administrator; Supabase auth settings and SMTP; Vercel env vars; Import starter content; approve content; supply media and the old-site URL export; decide retention; test notifications with `NOTIFY_OVERRIDE_TO` on a preview.

## Next steps for a new session
1. Review the Vercel preview with the owner; fix visual feedback.
2. Once the real Supabase project is set up, run a smoke test of invite, publish, upload, enquiry on the preview and update `docs/test-report.md` with a "deployed" section.
3. Items in `docs/BACKLOG.md` (Milestone 2 block).
