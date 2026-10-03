# Architecture

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind 4) on Vercel; Supabase (dedicated project) for auth, content, media and enquiries. No 3D library: interactions use plain canvas 2D and CSS 3D transforms.

## Creative approach
- **Living Canvas** (home): an abstract point-field that morphs between *Move / Respond / Surround / Connect* and reacts to pointer and touch. Labelled "abstract brand expression, not a product".
- **Digital showroom** (technologies): a perspective stage with abstract exhibit glyphs, a guided tour and a plain "view all" list. Shortlisted technologies flow into the enquiry as a **project brief** (stored only in the visitor's browser).
- **Team gallery**: CSS 3D portrait carousel (drag/swipe, arrows, keyboard, department filters) with a plain list of everyone beneath it.
- Readable content is always in the HTML; the visuals are enhancements with 2D fallbacks.

## Why no WebGL yet
Canvas 2D + CSS 3D give the depth and interaction in the brief at a fraction of the weight, with no extra dependency. Revisit (React Three Fiber) only if a real 3D model viewer or the later experience-composer needs it.

## Data flow (milestone 1)
Content lives in typed files in `src/content/` shaped like the future CMS tables. Milestone 2 moves them to Supabase tables with draft/published, RLS, and an editor admin. Enquiries already use the database: `POST /api/enquiries` validates, then inserts with the service role (server only). No anonymous write policy exists.

## Enquiries
Idempotent (`submission_id` unique), human reference `ENQ-XXXXXXXX`, honeypot, same-origin check, 20 KB body cap. Success is shown only after a stored row. Not yet: rate limiting, attachments (Storage), notification email (needs provider + recipients).

## Internationalisation plan
English at unprefixed URLs today. Add `next-intl` with `localePrefix: "as-needed"` so English URLs never change; add `hreflang` and RTL (`dir`) for Arabic when reviewed translations exist. Content tables get a `locale` column / translation table.

## Indexing
Everything is `noindex` and `robots.txt` disallows all unless `ALLOW_INDEXING=true`. See `LAUNCH.md`.
