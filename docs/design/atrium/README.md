# The Enginious Digital Atrium: whole-homepage exploration

Branch: `claude/digital-atrium-exploration`. This is an exploration for visual review. Main is untouched.

## What stays the same
The approved full-width video hero (headline, actions, showreel behaviour, Dubai / Riyadh / Poland strip) is main's version.
The only change is the poster: it now uses `YtPoster`, which falls back from `maxresdefault` to `hqdefault` and hides a
YouTube placeholder, so a missing high-res poster no longer leaves a broken image. All CMS data, routes, links, shortlist
controls and interactions are unchanged.

## Concept: one dark, glossy floor, with objects at different depths
Everything below the hero is one environment. Objects are obsidian monoliths with real thickness (stacked offset shadows),
a lit upper-right edge, a glossy floor with a horizon, light pools and cast shadows. Technology, work and people sit at
different depths. The neon path runs down the left as a thread and lights the scene nearest the middle of the screen
(`data-active`). Each scene has a different composition.

| Scene | Composition |
|---|---|
| Capabilities | Three large slabs at different depths. Scroll brings one forward and the neighbours recede. Chips switch manually. Links stay on the front slab. |
| Engineering tower | A centrepiece on a plinth with a floor, cast shadow and far silhouettes. Panel and hue follow the existing stage changes. |
| Technologies | An exhibition hall. Click, keys or arrows bring an exhibit forward and reveal its info. Others stay visible behind. Hover never moves targets. |
| Projects | A monument: the film surface rises and tilts up from its base with a bloom and reflection. If an image is assigned to the `projectsFocal` slot (`src/content/media.ts`) it fills the surface, otherwise the poster. Project cards sit in three depth tiers. |
| Clients | A constellation. Curated clients link to their projects. "Browse all N clients" opens the full list. A story panel shows the selection. |
| People | The existing perspective gallery on a lit dais with a spotlight. |
| Global | A recessed map with elevated office markers (solid diamonds) and separate project locations (rings). |
| Contact | A beam and rings on the floor with one action. |

## Interaction and robustness
Native scrolling, no hover-driven movement, text and actions on stable solid faces. Phones get intentional stacked
compositions. Reduced motion shows static states (capabilities active = middle, no thread animation, film flat).

## Performance (software-rendered headless Chromium, relative only)
Production builds of main and this branch, same harness, 3 runs, median. Files: `perf-{main,atrium}-{desktop,mobile}.json`.
Idle and pointer sweep are 60 fps on both. Whole-page scroll, CPU x1 desktop: 55.5 fps (main) vs 54.2 fps. CPU x4 desktop:
46.3 vs 45.8 fps. Mobile CPU x4: 56.1 vs 56.2 fps. This is parity, with slightly more dropped frames on desktop scroll at x1
and x4 (3 vs 5, 20 vs 18 frames over 33 ms). Real-device GPU numbers have not been measured. Techniques: static
environments, only transform and opacity transitions, no filters or canvas, `content-visibility`, compositor hints only while moving.

## Checks
Build, tsc, eslint, `npm test` (28), `home-test.cjs` (hero, all pass), `scenes-test.cjs` (overflow at 390 / 430 / 768 / 1280 /
1440 / 1920, scene controls, reduced motion), CMS integration e2e (49). Screenshots: `before/` (main plus poster fix) and `after/`.
In screenshots YouTube is stubbed, so the hero shows a neutral stand-in poster, not project footage.

## Limitations
- No project imagery or client logos were invented. The projects focal surface shows the poster until real media is assigned.
- Some tests are shallow (the scenes test checks that controls exist and work, not pixel positions).
- Dev mode shows a pre-existing hydration warning in TechForm; production is clean.
- Still to judge by eye on a real GPU device.

## Revert
Remove `./world.css` from `src/app/(site)/page.tsx` and restore the files changed against main, or simply do not merge the branch.
