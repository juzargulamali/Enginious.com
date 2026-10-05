# Regional pages and detail pages

## Diagnosis
The striped panels were `Placeholder` components. Regional pages rendered them for missing media and empty sections. Project pages
were gated by `caseStudy` and technology pages by `detailed`, so 26 projects and most technologies had no page. Both gates are removed.
Every published item now has a page; drafts and unpublished items are absent from content and return 404.

## CMS fields (Region records, no migration needed: new fields live in existing jsonb)
Headline, eyebrow, hero image, video URL and poster, story title and story, At a glance facts, services delivered locally,
services supported by Dubai, featured projects, delivery process, CTA title and text, card fields, plus page SEO via Page search settings.
Empty fields fall back to built-in text. Empty sections are not rendered. Services carry a "Delivered from ..." or
"Supported by the Dubai team" label only where the CMS lists say so.

## Detail pages
`/work/<slug>` and `/technologies/<slug>` render for every published item: title, summary, media, full inline video player
(no segment limits), related items. Missing sections are hidden. New CMS items work without a code change. The sitemap lists all
published, non-noindex projects and technologies.

## Information still needed (not invented)
Poznań street address and local contacts; local team members; which services are delivered locally in Riyadh and Poznań;
confirmed European projects; regional hero videos; fuller Saudi and Europe stories.

## Tests
`bash scripts/test/e2e.sh regions-e2e` (27 checks): placeholders, CTAs keep region, CMS edit/save/reload/clear, SEO, all projects
and technologies have pages, draft/publish/unpublish. Also admin, public, media, enquiry, video-region suites, indexing-check,
gallery/home/hero-sound, video-preview-test.
Real vs stub: card previews and the Play handoff use a STUBBED YouTube API (sandbox cannot reach YouTube); direct video uses a real
`<video>`. Real YouTube playback is unverified here.
