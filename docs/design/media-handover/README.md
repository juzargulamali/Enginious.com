# Uploaded images replace decorative artwork

Rule (automatic, no CMS toggle): wherever a component pairs a photograph with decorative fallback artwork, assigning an image hides the artwork, and the artwork only returns if the image fails.

How it works
- A component marks its root `data-media="pending"` when an image is assigned (server-rendered, so the artwork is never painted first).
- `Photo` (src/components/Photo.tsx) flips that root to `loaded` or `failed` (handles images that finished or failed before hydration). No React state.
- CSS hides the artwork for `pending` and `loaded` and keeps it for `failed` or when nothing is assigned. A failed image is also hidden (no broken-image icon or alt text).
- Applied to: capability cards (line drawing and floor glow), Contact background (beams, shards, floor, haze, and the opaque stage wash that sat over the photo, now a light readability gradient), team portraits (monogram).
- Section borders and neon lines are untouched.
- New components that combine a photo with artwork only need `data-media` on their root when an image is assigned.

Test: `python3 scripts/perf/media-test-assets.py <repo root>` adds a valid test image, a broken-URL image and Contact scene to a working copy (do not commit), build, then `node scripts/perf/media-handover-test.cjs <base url> [outdir]` (26 checks: loaded, none, broken, no flash with a slow image, desktop and mobile). Run against main it fails 14 of 26, which is the reported problem.
