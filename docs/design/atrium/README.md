# The Enginious Digital Atrium: hero exploration

**Status: single-scene exploration for approval. Not merged. Nothing else on the site has changed.**
Branch `claude/digital-atrium-exploration`, cut from `main` at `82e4f2b`. Content, CMS integration, navigation, regional links, showreel controls and the project brief are unchanged; only the homepage hero's presentation is new.

## The idea

You look through a dark architectural opening into a spacious hall. The edges are almost black. A single light source sits at the far end of the hall (upper right of centre): faces that look toward it carry a thin teal rim and shadows fall away from it, down and to the left. The Enginious showreel is the lit screen at the end of the hall, which makes it the main visual evidence. The headline sits in a calm dark area on the left, in front of everything.

| Depth | What it is | How it is built |
|---|---|---|
| **Distant environment** | near-black space, a soft teal glow at the vanishing point, floor and ceiling rails converging on it, a few dark wall fins with a rim on the lit edge, the screen's cast shadow and glow | one static SVG (`AtriumEnv`) and a static overlay (`AtriumFrame`). Painted once, **never transformed** |
| **Middle** | the showreel screen in real CSS 3D (yawed 6 degrees toward the room's centre), set in three receding planes, two light rails and a floor light | the screen is one real 3D element (video, poster, neon edge). Planes, rails and floor light are **one SVG** (`AtriumPlanes`) with the perspective baked in using the same maths the browser uses, so it lines up with the real screen |
| **Foreground** | headline, description, **Start a project**, **Watch the showreel**, the Dubai / Riyadh / Poland strip | sharp text and controls, separated by a restrained shadow (down-left) and a rim of light on top and right edges |

Everything decorative is `aria-hidden`; the neon edge that flows around the screen and the runners on the regional strip are the existing neon system.

## Behaviour

- **Complete before anyone moves the pointer.** Nothing is animated until the pointer moves; the CSS pose is the resting composition.
- **Desktop pointer (mouse only, wider than 900 px):** four layers shift opposite to the pointer, nearer ones more: planes 6 px, screen 9 px, copy 11 px at the extreme, eased, and they return gently to rest when the pointer leaves. **Links and buttons hold still:** the moment the pointer is over one, the layers freeze, so targets never drift under the cursor.
- **Scroll (native):** as the hero leaves, nearer layers leave faster (copy, then screen, then planes) while the environment stays put, and the hero fades into the next section. No hijacking, no delay.
- **Mobile (390 / 430 / 768):** a static, intentional composition: headline, then the framed showreel with a slight tilt and two receding planes, then the description, both actions and the regional strip, all inside the first screen. No pointer behaviour, no hover-only controls, no horizontal overflow.
- **Reduced motion:** a fully composed static scene. No pointer or scroll movement, no video, play cue on the screen.
- **Showreel:** unchanged logic. YouTube loads after first paint, only when motion is allowed; if it is unavailable the poster or a neutral dark screen with a play cue remains. Clicking the lit screen (mouse) or the **Watch the showreel** button (keyboard and everyone) opens the same lightbox. The pause control sits on the screen. **No project footage is invented**: when there is no poster the screen shows a neutral dark panel labelled "Enginious showreel".
- **No device-motion permissions, no WebGL, no new dependency, no filters.**

## Performance: what was found and what was done

First attempt (real 3D planes, a moving full-screen environment, large shadows) dropped the desktop pointer sweep to **39 fps** and scrolling to **43 fps** in the test browser (baseline 60). Controlled experiments (`scripts/perf/hero-measure.cjs --css`) showed the cost was the number and size of layers that had to be recomposited each frame, not any single effect: removing the moving environment alone recovered most of it. The shipped version therefore:

1. makes the environment and the dark opening **static** (they never move, so they never cost a layer);
2. bakes the planes, rails and floor light into **one** SVG;
3. moves only **four** small layers, written by **one** rAF scheduler (no React state), which sleeps when everything is at rest, when the hero is off-screen or the tab is hidden;
4. promotes layers (`will-change`) **only while they are moving** and releases them afterwards (the old hero held `will-change` on five layers permanently);
5. freezes the layers over links and buttons (also fixed an intermittent click flake in the test suite).

Same harness, same stubs, same viewports, same CPU throttling, median of 3 runs, headless Chromium with a **software renderer** (read as relative, not as device numbers). Raw data: `perf-before.json`, `perf-after.json`.

| Scenario | fps before -> after | frames over 33 ms | main-thread busy |
|---|---|---|---|
| Desktop 1440, idle 5 s | 60 -> 60 | 0 -> 0 | 2.4% -> 2.7% |
| Desktop, pointer sweep 4 s | 60.1 -> 59.9 | 0 -> 1 | 4.7% -> 6.6% |
| Desktop, scroll through the hero | 60.3 -> 59.4 | 0 -> 1 | 6.3% -> 9.8% |
| Desktop, **CPU x4**, idle | 60 -> 60.2 | 0 -> 0 | 9.5% -> 9.6% |
| Desktop, **CPU x4**, pointer sweep | 60.2 -> 59.8 | 0 -> 1 | 18.1% -> 21.7% |
| Desktop, **CPU x4**, scroll | 59 -> 57.7 | 1 -> 3 | 27.9% -> 33.6% |
| Phone 390 (DPR 2), idle | 60 -> 60 | 0 -> 0 | 2.3% -> 2.2% |
| Phone, scroll | 60.1 -> 59.8 | 0 -> 0 | 7% -> 6.7% |
| Phone, **CPU x4**, idle / scroll | 60.2 / 59.9 -> 60.2 / 60.2 | 0 -> 0 | 8.4% / 29.2% -> 8.2% / 25.3% |

**Honest read:** parity on idle, phone and the 4x-throttled phone; a small cost on desktop interaction (a few percent more main-thread time, one or two extra frames over 33 ms in a run). Hero DOM grew from 61 to about 180 nodes, almost all SVG line segments; that costs nothing at runtime. Real GPU paint cost cannot be measured in this environment; it should be checked on your own machine (the preview) and on a mid-range phone.

## Verification

**Local (production build, headless Chromium, YouTube stubbed):**
- `scripts/perf/atrium-test.cjs`: **54 / 54**: viewport rules at 1440, 1280, 390, 430, 768 (regional strip inside the first screen, actions above it, copy clear of the screen, no overflow, links at least 44 px tall on desktop and 40 px on phones), layer behaviour (idle writes nothing, off-screen writes nothing, environment never transformed, `will-change` only while moving, return to rest, depth ordering, size of movement under 14 px), reduced motion, keyboard order (pause, Start a project, Watch the showreel, Dubai, Riyadh, Poland), nothing decorative focusable, region links go to /uae, /saudi-arabia, /europe, navigation and project brief, the lit screen opens the lightbox, buttons hold still.
- `scripts/perf/home-test.cjs` (existing hero behaviour: poster first, YouTube after paint, pause/play, lightbox, focus return, header, neon live/paused, Save-Data, reduced motion, phone): **24 / 24**, six consecutive clean runs.
- `scripts/perf/site-test.cjs` (every route, indexing rules, skip link, mobile menu): all pass.
- Type check, lint and unit tests pass; production build succeeds.
- CMS integration (`scripts/test/e2e.sh public-e2e`, the public site reading published content from the local database stand-in, including draft isolation and starter-content fallback): **49 / 49**.

**Not verified here:** the deployed preview in a real browser, real devices, real GPU paint cost, screen readers, the real showreel thumbnail (YouTube is unreachable from the build sandbox: all screenshots use a neutral stand-in poster that says so; the preview shows the real thumbnail and video).

## Screenshots

`before/` and `after/` (1440, 1280, 390, reduced motion, scrolled); `compare-*.png` put them side by side.

## Files

New: `src/components/home/AtriumScene.tsx` (static environment, frame and the baked planes). Changed: `src/components/home/ShowreelHero.tsx` (structure and the motion scheduler), `src/app/(site)/home.css` (hero section only). Tooling: `scripts/perf/hero-measure.cjs`, `scripts/perf/atrium-test.cjs`, small selector updates in `scripts/perf/home-test.cjs`.
Removed from the hero: the full-bleed video background, the old stage illustration (beams, pillars, ring), the full-viewport neon frame and the pointer spotlight.

## To revert

The exploration lives on its own branch. Closing the branch or not merging it leaves `main` exactly as it is.

## Decisions for your review

1. Is the depth strong enough, or should the environment carry more architecture (more ceiling structure, a nearer foreground element)?
2. Is the screen too large or too small relative to the headline? (It is 44% of the width at desktop.)
3. Keep the click-the-screen shortcut? (The button remains the keyboard path either way.)
4. Roll the language out to other pages? That is deliberately not done: the same static-environment and one-baked-layer rules would carry over, so the cost per page stays small.
5. Known and left alone: a pre-existing, dev-only hydration warning about floating-point digits in a technology icon (`TechForm`), unrelated to this work.
