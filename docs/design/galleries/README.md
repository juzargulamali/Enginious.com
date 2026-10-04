# Full-width technology showroom and team gallery

Branch `claude/gallery-showroom-team`, cut from latest `main`. The abandoned depth exploration is not included.

## What changed (homepage only)
- **Showroom** (`ShowroomTeaser`): a full-width exhibition stage. The selected technology stands centre on a podium under a spotlight, the others sit further back on either side. The count follows the CMS (`technologies` published list), not a fixed number. Heading and text stay in the normal reading column.
- **Team gallery** (`TeamGallery wide`): the same gallery, with a full-width stage and up to three neighbours each side. Passed only from the homepage, so `/company/team` is unchanged.
- **Cursor control** (`src/lib/useStageSteer.ts`, shared): hover-to-select (about 300 ms, needs fresh pointer movement, settles before another), gentle edge steering (outer 14% on each side, neutral middle 72%, 280 ms dwell, 0.4 to 1.15 steps per second), stops on neutral zone / leaving the stage / controls. Mouse with hover only; off for reduced motion (steering); touch uses swipe and tap.
- Clicking a side item centres it. Clicking the centred exhibit opens its details page; clicking the centred person focuses and scrolls to their profile, and steering pauses while the profile has focus.
- Keyboard arrows, arrow buttons, drag/swipe, department filters, list view, project brief controls are kept. The old scroll-driven exhibit selection in the showroom is removed (page scrolling never rotates a gallery).
- Hint "Move to explore · Click to discover" shows only on fine-pointer devices.

## Not in scope
Category filters and the guided tour live on the `/technologies` showroom (`Showroom.tsx`), which is unchanged; the homepage showroom never had them.

## Checks
`scripts/perf/gallery-test.cjs` (50 checks), `home-test.cjs`, `npm test`, tsc, eslint, CMS e2e (49). Screenshots in this folder. Performance vs main: `perf-*.json`.
