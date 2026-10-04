# Backlog (tracked so nothing disappears between milestones)

## Milestone 1 (review): done
Home + Living Canvas, technologies showroom + Tri-Helix page, Work index + WHX case study, team gallery + leadership, Europe, contact + enquiry API/migration, noindex/robots/sitemap.

## Design revision (current): homepage benchmark
- [x] Profiling harness + before/after report (`docs/performance.md`).
- [x] Kinetic Tower hero, idea-to-experience story, evidence reel, real-geography map, routes, closing CTA.
- [x] Public review notes / placeholder labels removed (internal notes in `docs/content-todo.md`).
- [ ] **Awaiting visual approval of the homepage before rolling out:**
  - [ ] People: large-scale perspective gallery (transform-only motion, receding neighbours, swipe/keyboard).
  - [ ] Technologies: showroom using the distinct `TechForm` exhibits on a lit floor; per-technology pages.
  - [ ] Regions (UAE / Saudi Arabia / Europe) with the map and honest service lists.
  - [ ] Contact: stage-by-stage project-planning journey tied to the shortlist.
  - [ ] Work index/case studies and Insights/Careers in the same language.
  - [ ] Apply the same perf rules (no canvas loops, direct transforms, no backdrop/filter) and re-measure each page.

## Homepage revision 3 (this round): showreel + connected world
- [x] Showreel hero (file + YouTube modes, poster, controls, lightbox, phone composition, reduced motion, Save-Data).
- [x] Neon system (edges, routed traces, spine) and the seven scenes.
- [ ] Awaiting visual approval before extending the direction to People, Technologies, Regions, Contact, Work.
- [ ] Replace the YouTube background with the supplied file when available.
- [ ] Test the deployed preview on real desktop and phone devices (not possible from the build environment).

## Round 4 (this round)
- [x] Image registry (focal point, alt, licence, status), optimiser, media_assets migration; Juzar portrait in.
- [x] Hero regional strip, two-layer world map (19 project locations), people gallery, Company page, Contact redesign, scroll choreography.
- [ ] **Blocked on files:** the five attached photos (send as files) and stock sources; then `bash scripts/images/ingest-supplied.sh`.
- [ ] Reduce scroll cost (see docs/performance.md, revision 4).
- [ ] Brief uploads (storage + validation); Poland city; real leadership messages.

## Milestone 2 (preview built; awaiting owner setup and review)
- [x] CMS: roles, invite-only access, content engine (draft/publish/unpublish/archive, revisions, slugs, redirects, ordering, featured), 13 content types, admin UI, import of the existing approved content.
- [x] Public site powered by the CMS with starter-content fallback; regions, Insights, Careers, FAQs, Solutions, Privacy (provisional), 404/error pages.
- [x] Media library (validated uploads, derivatives, private originals, picker, delete protection), company-profile PDF.
- [x] Enquiries: inbox, notes, triage, rate limiting, private attachments, notification adapter with retry (tested only against a local stand-in).
- [x] SEO infrastructure, indexing safeguards, structured data, redirects; consent-gated analytics integration point; i18n plan.
- [ ] **Owner:** apply migrations, bootstrap the first administrator, Supabase auth settings, SMTP, env vars (`docs/cms-setup.md`).
- [ ] **Owner:** approve content (see `docs/content-todo.md`), supply media (`docs/asset-handoff.md`), provide the old-site URL export (`docs/url-migration.md`), decide retention (`docs/privacy-retention.md`).
- [ ] Verify against the real Supabase project and a real email provider (stand-ins only so far).
- [ ] Larger uploads (signed direct-to-storage uploads; today limited to 4 MB by the hosting body cap) and video delivery service.
- [ ] Full Content-Security-Policy, MFA for CMS users, attachment malware scanning (`docs/security.md`).
- [ ] Per-locale content and language switching (`docs/i18n-plan.md`): only when Arabic content is ready.
- [ ] Accessibility audit with assistive technology; real-device performance review (see `docs/performance.md`).
- [ ] Remaining technology pages and case studies as content arrives (add them in the CMS: no code needed).

## Later
- [ ] Experience composer (3D) only after core launch.
