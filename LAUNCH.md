# Launch checklist (do NOT do before the site is finished and tested)

Nothing below has been done. The domain, DNS and email are untouched; indexing is off everywhere.

## Content and approvals
- [ ] Import the starter content into the CMS (every type) and review it page by page (`docs/cms-setup.md` step 5).
- [ ] Approve or edit: Mission and Vision, leadership messages (private until you tick approval), client names and relationships (direct / agency / unconfirmed), project attributions, technology specifications, Poland city and contacts.
- [ ] Real testimonials only, each with written permission ticked (the fictional samples can never be published).
- [ ] Media: replace every non-`real` image (`docs/asset-handoff.md`), add alt text, credits and licences; upload the approved company-profile PDF and select it in Site settings.
- [ ] Privacy notice: have it reviewed, decide retention (`docs/privacy-retention.md`), then set the status to Approved.
- [ ] Per-page search titles and descriptions for the 13 fixed pages (Page search settings) and a default sharing image.

## CMS, email and operations
- [ ] Supabase: migrations applied, sign-ups off, redirect URLs set, password minimum 12, SMTP configured (`docs/cms-setup.md`).
- [ ] First administrator created with `supabase/bootstrap-admin.sql`; team invited as Editors.
- [ ] Enquiries: set region recipients in the CMS; set `NOTIFY_PROVIDER` and keys; send a test with `NOTIFY_OVERRIDE_TO` on a Preview; only then enable for Production.
- [ ] Decide plans: Vercel Pro (Hobby is non-commercial); Supabase Pro (backups, no pausing).
- [ ] Remove or rotate `SETUP_CHECK_TOKEN` / retire `/setup-check`.

## Domain and search (last)
- [ ] Complete `docs/url-migration.md` (needs your export of the old site's URLs) and load the redirects.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the real https domain (Production scope).
- [ ] Add `enginious.ae` (and `www`) in Vercel -> Domains; set the records Vercel shows. Test on a subdomain first (for example `new.enginious.ae`). Keep MX/SPF/DKIM email records unchanged.
- [ ] Set `ALLOW_INDEXING=true` in Vercel, **Production scope only**, and redeploy. Run `bash scripts/test/indexing-check.sh` logic by hand: view source on the live site (no `noindex`), `/robots.txt`, `/sitemap.xml` (public domain only), `/admin` still noindex.
- [ ] Submit the sitemap in Search Console.

## Real-device checks (cannot be done from the build environment)
- [ ] Phone and desktop review of the preview: hero video, tower, gallery, map, contact form, shortlist; admin on a phone.
- [ ] Send a real test enquiry (with a small PDF) and an invitation to yourself; confirm the email arrives and the attachment opens only when signed in.
