# Architecture

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind 4) on Vercel; Supabase (dedicated project) for auth, content, media and enquiries. No 3D library: interactions use plain canvas 2D and CSS 3D transforms.

## Creative approach
- **Living Canvas** (home): an abstract point-field that morphs between *Move / Respond / Surround / Connect* and reacts to pointer and touch. Labelled "abstract brand expression, not a product".
- **Digital showroom** (technologies): a perspective stage with abstract exhibit glyphs, a guided tour and a plain "view all" list. Shortlisted technologies flow into the enquiry as a **project brief** (stored only in the visitor's browser).
- **Team gallery**: CSS 3D portrait carousel (drag/swipe, arrows, keyboard, department filters) with a plain list of everyone beneath it.
- Readable content is always in the HTML; the visuals are enhancements with 2D fallbacks.

## Why no WebGL yet
Canvas 2D + CSS 3D give the depth and interaction in the brief at a fraction of the weight, with no extra dependency. Revisit (React Three Fiber) only if a real 3D model viewer or the later experience-composer needs it.

## Data flow (Milestone 2)

```
Editors -> /admin (Next.js pages + Server Actions, acting AS the signed-in user)
            |  RLS + SECURITY DEFINER functions (cms_publish, cms_unpublish, ...)
            v
Supabase Postgres:  content_items (drafts, staff only)  --publish-->  content_published (public read, "_" fields stripped)
                    content_revisions (history)   redirects   media_assets   enquiries (+notes, attachments)   cms_roles   cms_audit
Supabase Storage:   media (public derivatives)  documents (public PDFs)  private (originals)  enquiry-attachments (private)

Public site (Next.js, ISR): getContent() reads content_published + media_assets with the anon key, cached under the tag "content".
   - Publishing/unpublishing/archiving/media changes call updateTag("content") + revalidatePath("/", "layout"): pages update immediately.
   - For each content type the CMS has not been initialised for, the built-in starter content (src/content/*.ts via lib/content/seed.ts)
     is served, so nothing breaks before import. Once a type is in the CMS, the CMS is authoritative (unpublishing never resurrects starter content).
   - Server components call getContent(); client components read a lean slice through ContentProvider (src/components/ContentProvider.tsx).
```

**Content model.** One generic engine, 13 types defined in `src/lib/cms/schema.ts` (field definitions drive the editor form, format validation, publish-time validation and the public mapping in `src/lib/content/assemble.ts`). Keys starting `_` are internal (approval flags, notes) and are removed from the public snapshot by the database. Publishing is validated twice: field-level messages in the app, a backstop in `cms_validate_publish` (testimonials need permission and cannot be samples; direct/agency clients need approval and wording; outcomes and specifications must be verified/confirmed).

**Auth.** Supabase Auth cookies via `@supabase/ssr`; `src/proxy.ts` refreshes the session and gates `/admin`; `src/lib/cms/auth.ts` re-checks the role everywhere. Roles in `public.cms_roles` (administrator / editor), invite-only.

**Media.** `/api/admin/media` validates by signature, re-encodes with sharp to 480/960/1600 px WebP, stores derivatives in a public bucket under random paths and the original in a private bucket. `Photo` renders `srcset` from the library or the built-in registry and labels concept/stock/preview images.

**Enquiries.** `POST /api/enquiries` validates, rate-limits (database-backed), stores (service role), then notifies staff after the response (`after()`); notification outcome is recorded and retryable. Attachments are a second request (`/api/enquiries/attachments`) to a private bucket.

**SEO.** `lib/seo/indexing.ts` is the single indexing decision (previews never indexable; needs a real https public origin). `buildMetadata()` merges page fields, CMS page settings and defaults; sitemap and robots follow the same rule; JSON-LD uses verified facts only; redirects live in a validated table applied by the proxy.

**Tests.** `docs/test-report.md`. Local stand-ins for Supabase live in `scripts/test/` (never used against a real project).

## Internationalisation plan
English at unprefixed URLs today. Add `next-intl` with `localePrefix: "as-needed"` so English URLs never change; add `hreflang` and RTL (`dir`) for Arabic when reviewed translations exist. Content tables get a `locale` column / translation table.

## Indexing
Everything is `noindex` and `robots.txt` disallows all unless `ALLOW_INDEXING=true`. See `LAUNCH.md`.
