# Preparing for English and Arabic (nothing is translated or shown yet)

No language switcher, no Arabic text and no `hreflang` tags exist, and none should be added until reviewed Arabic content exists.

**What is already prepared**
- `content_items.locale` (default `en`) and `translation_group` (items that are translations of each other share a group). The slug is unique per `(type, locale, slug)`, so Arabic items can have their own slugs.
- The public read layer only loads `locale = 'en'`; the sitemap and canonical code are locale-agnostic.
- Page SEO, settings and all text live in the CMS, so a translated copy is another item, not a code change.

**How to add Arabic later**
1. Adopt `next-intl` with `localePrefix: "as-needed"` so English URLs never change and Arabic lives under `/ar/...`.
2. Duplicate each item in the CMS with `locale = 'ar'` (add a locale selector to the editor and list; the model already supports it) and the same `translation_group`.
3. Make `getContent()` locale-aware (filter `locale`) and add per-locale fallbacks.
4. Right-to-left: set `<html lang="ar" dir="rtl">`, convert physical CSS (`left/right`, `margin-left`, transforms) to logical properties, and test the neon/3D components mirrored.
5. `hreflang`: emit alternates **only** for pages that exist in both languages (from `translation_group`), plus `x-default`. Include them in the sitemap per locale.
6. Arabic slugs: allow transliterated Latin slugs or Unicode slugs (decide); update the slug validator and redirects accordingly.
7. Fonts: add an Arabic-capable font; check the headline sizes.
