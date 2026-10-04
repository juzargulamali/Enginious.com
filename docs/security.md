# Security notes

What protects what, and how it was checked (see `docs/test-report.md` for results).

- **Authentication:** Supabase Auth, invite-only, passwords of at least 12 characters, recovery by emailed one-time link. No default password. No automatic first administrator.
- **Authorization (three layers):** (1) `proxy.ts` sends signed-out visitors away from `/admin` and returns 401 for `/api/admin`; (2) every page, Server Action and route handler re-checks the role (`src/lib/cms/auth.ts`); (3) the database enforces row level security, column grants and function checks, and the CMS acts as the signed-in user so the database, not the UI, decides. The service-role key is used only after an explicit role check, or to store enquiries.
- **Public data:** the anon key can read only `content_published` (snapshots with internal `_` fields stripped), enabled redirects and published public media. It cannot read drafts, revisions, enquiries, notes, attachments, roles, audit, rate limits or private storage.
- **Uploads:** type decided by file signature (JPEG/PNG/WebP/PDF only), SVG and active content refused, images re-encoded to WebP (removes metadata and embedded payloads), random storage paths, originals and enquiry attachments in private buckets, 4 MB limit (hosting body cap).
- **Rendering:** editor text is rendered by a small Markdown parser that outputs React elements only (no HTML, `javascript:` links dropped, restricted click-to-load YouTube embeds). JSON-LD is escaped.
- **Anti-abuse:** honeypot, same-origin check, body caps, database-backed rate limits on salted hashes (per address and per email), attachments need the secret submission id.
- **Headers:** `nosniff`, HSTS, `Referrer-Policy`, `Permissions-Policy`; `/admin` also `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `no-store`, noindex.
- **Not done yet:** a full Content-Security-Policy (needs a nonce strategy for the inline JSON-LD and on-demand YouTube); MFA for CMS users (enable in Supabase when available on your plan); malware scanning of attachments (staff open them through short-lived signed links); automated backups are a Supabase plan feature.
