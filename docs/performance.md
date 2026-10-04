# Performance report

All numbers come from `scripts/perf/measure.cjs` (raw JSON in `docs/perf/`). It drives a real Chromium through scripted interactions and records frame pacing (requestAnimationFrame intervals), long tasks, Event Timing latency, React commits (via the DevTools hook) and main-thread time (CDP `Performance.getMetrics`). Each figure is the **median of 2-3 runs**.

**Read this honestly.** The test browser renders in software (no GPU) on a shared machine, so absolute numbers are not what a visitor's laptop or phone will show. What *is* meaningful is the comparison under identical conditions, and **CPU x4 throttling** (a modest laptop or mid-range phone) which exposes headroom problems that a fast machine hides. *Zero console errors and 60 fps on a fast machine did not mean the page was smooth*: the original homepage was already "60 fps" at normal speed while burning a fifth of the main thread doing nothing.

Before = commit `90dcf87` (the deployed Milestone 1). After = this revision. GPU paint cost cannot be measured here; where I removed GPU-heavy patterns without a measurement I say so.

## 1. Findings (what was actually slow, and why)

1. **The homepage canvas was the dominant cost: about 98% of idle homepage work.** An idle homepage used 17.9% of the main thread at normal speed and 78.5% at 4x CPU. Controlled experiment: with only the canvas disabled the same page used 0.8% / 1.7%. The loop (780 points, additive blending, 60 fps, never pausing while visible) scales with pixel count, so Retina screens suffer most: at device-pixel-ratio 2 the old idle page used 44.1% (normal speed) and **99.6% at 4x, dropping to 35 fps with 32 frames over 33 ms in five seconds**. That is what "laggy" looked like on the reviewer's machine: no headroom left for scrolling, clicks or hover. (Why the visual also failed to start in their browser is unknown; the canvas is gone, so that failure mode no longer exists.)
2. **Gallery navigation cost is style recalculation from the card transitions.** Removing the 0.7 s card transform transition cut style work by 60% (180.8 to 72.7 ms per 8 clicks at 4x); removing the glow/box-shadow cut it by 29%; removing the halo and portrait backgrounds cut nothing (-7%). React was not the problem: one commit per click, no extra renders.
3. **Showroom pointer movement cost is style invalidation, not paint.** Hiding the floor (-9%) or removing the SVG drop-shadow filter (no change) did little; removing the transitions on the pointer-driven transforms cut it by 28%. Pointer events were also writing styles on every event instead of once per frame.
4. **Route transitions are acceptable but not free**: median 77 ms (normal) / 165 ms (4x) per hop, with 4 React commits per hop and one 78 ms long task at 4x. Mostly hydration of the destination page.
5. **Precautionary, not measured:** a fixed full-page background + masked fixed grid, `backdrop-filter` on the sticky header and every panel, and SVG drop-shadow filters. They force full-viewport repaints on real GPUs but cost nothing visible in this software renderer, so no honest number exists. They were removed anyway.

## 2. Before / after: homepage

Main-thread busy time while the page is idle or being interacted with (lower is better). Frame drops = frames over 33 ms.

| Scenario | Before | After |
|---|---|---|
| Idle 5 s, desktop, CPU x1 | 17.9% busy, 60 fps, 0 drops | 2.1% busy, 60 fps, 0 drops |
| Idle 5 s, desktop, **CPU x4** | 78.5% busy, 60.2 fps, 0 drops | 7.8% busy, 60.2 fps, 0 drops |
| Pointer sweep 4 s, desktop, CPU x1 | 19.5% busy, 60.1 fps, 0 drops | 5.4% busy, 60.2 fps, 0 drops |
| Pointer sweep 4 s, desktop, **CPU x4** | 82.7% busy, 59.2 fps, 1 drops | 20.9% busy, 60.1 fps, 0 drops |
| Idle 5 s, **Retina (DPR 2), CPU x4** | 99.6% busy, 35 fps, 32 drops | 7.4% busy, 60.2 fps, 0 drops |
| Pointer sweep, **Retina (DPR 2), CPU x4** | 100.3% busy, 36.8 fps, 17 drops | 19.1% busy, 60.1 fps, 0 drops |
| Idle 5 s, **phone viewport (390 px, DPR 2), CPU x4** | 99.3% busy, 47.2 fps, 14 drops | 7.3% busy, 60.2 fps, 0 drops |
| Pointer/touch sweep, phone, CPU x4 | 99.8% busy, 40.2 fps, 5 drops | 18.7% busy, 60.2 fps, 0 drops |
| Scroll whole page, phone, CPU x4 | 47.3% busy, 53.3 fps, 4 drops | 38.9% busy, 58.7 fps, 3 drops |
| Scroll whole page, desktop, CPU x4 | 33.6% busy, 60.1 fps, 0 drops | 38% busy, 54.9 fps, 3 drops |

**Scrolling got slightly worse, and that is expected:** the new homepage is about twice as long (roughly 6,600 px against 3,300 px) with a map, a reel and more sections, so a full scroll does more layout (121 ms against 12 ms at 4x) and shows 3 frames over 33 ms against 0 in this test. I checked whether `content-visibility` caused it: with it off, scroll is the same (3 frames over 33 ms) but idle load triples (21% against 7.8%), so it stays. Next improvement candidates: fewer sections visible at once on mobile and lazy-loading the map image.

## 3. Before / after: other interactions (CPU x4)

The gallery and showroom pages have **not been redesigned yet** (they are in the rollout). The changes so far are small, targeted fixes: pointer writes throttled to one per frame, pointer-driven transitions removed, filters removed, `will-change` on gallery cards.

| Interaction | Before | After |
|---|---|---|
| Gallery: next x8 | style 180.8 ms, worst input delay 64 ms, 0 drops | style 155.6 ms, worst input delay 64 ms, 0 drops |
| Gallery: drag/swipe x4 | style 137.7 ms, worst input delay 40 ms, 0 drops | style 125.7 ms, worst input delay 40 ms, 0 drops |
| Showroom: select every exhibit | style 80 ms, worst input delay 136 ms, 2 drops | style 47.4 ms, worst input delay 88 ms, 1 drops |
| Showroom: pointer sweep 3 s | style 248.7 ms, worst input delay 56 ms, 0 drops | style 201.1 ms, worst input delay 32 ms, 0 drops |
| Showroom: category switches | style 55.2 ms, worst input delay 80 ms, 0 drops | style 53.8 ms, worst input delay 64 ms, 0 drops |
| Route transitions x4 | style 39.7 ms, worst input delay 64 ms, 6 drops | style 45.5 ms, worst input delay 48 ms, 3 drops |

Honest read: showroom *select* improved clearly (style -41%, one fewer React commit, worst input delay 136 to 88 ms); the pointer sweep improved 19%; the gallery and category switches barely moved (-14% / ~0). The gallery and showroom need the same treatment as the homepage (transform-only, compositor-driven motion), which is scheduled with their redesign. Route transitions are unchanged within noise.

## 4. Design rules that follow (apply to every page)
- No canvas or per-frame JavaScript loops for decoration. Motion is CSS transforms on a handful of elements; JavaScript only runs while the visitor is actively dragging or a spring is settling, then stops.
- Write transforms directly to the few moving elements instead of changing inherited CSS variables (which invalidates a whole subtree).
- One style write per animation frame for pointer-driven effects; mouse only (no pointer parallax on touch).
- No `backdrop-filter`, no SVG/CSS `filter` on animated content, no fixed full-page backgrounds.
- `content-visibility: auto` on below-the-fold sections.
- Decorative animations pause when offscreen; reduced-motion removes them; the hero is plain HTML+CSS, so it works with JavaScript disabled.

## 5. Reproduce
```bash
npm run build && npx next start -p 3300 &
NODE_PATH=$(npm root -g) node scripts/perf/measure.cjs --base http://localhost:3300 --label run --rates 1,4 --runs 3 --out docs/perf/run.json
NODE_PATH=$(npm root -g) node scripts/perf/hero-test.cjs http://localhost:3300   # behavioural checks
```
Options: `--view mobile`, `--dpr 2`, `--only home,gallery,showroom,routes`, `--css file.css` / `--init file.js` for controlled experiments (`docs/perf/exp-*.json` are those experiments).


---

# Revision 3: showreel homepage (measured performance, reported separately from visual approval)

**What this does and does not cover.** The build environment cannot reach YouTube, so *the real showreel was never loaded*. Numbers below are for (a) the page with the video layer absent (YouTube blocked: poster/stage only) and (b) a self-hosted `<video>` playing a generated 4 s test clip, as a proxy for the page cost of a playing file. **The cost of the YouTube player itself (third-party scripts, decoding) is not measured and must be tested on the deployed preview.** Same harness, same conditions as the earlier sections (software rendering, CPU x4 throttle ~ a modest laptop/phone).

## Homepage, three generations (desktop, CPU x4)
| Scenario | Original canvas hero | Kinetic Tower hero (rev 2) | Showreel + connected scenes (rev 3, video absent) |
|---|---|---|---|
| Idle 5 s | 78.5% busy, 60.2 fps, 0 slow frames | 7.8% busy, 60.2 fps, 0 slow frames | 11% busy, 60 fps, 0 slow frames |
| Pointer sweep 4 s | 82.7% busy, 59.2 fps, 1 slow frames | 20.9% busy, 60.1 fps, 0 slow frames | 29.5% busy, 59.9 fps, 0 slow frames |
| Scroll whole page | 33.6% busy, 60.1 fps, 0 slow frames | 38% busy, 54.9 fps, 3 slow frames | 44.5% busy, 51 fps, 6 slow frames |
| Route transitions (median hop) | 165 ms | 158 ms | 156 ms |

Other conditions for rev 3: Retina (DPR 2) idle **10.9% busy, 60 fps, 0 slow frames**; phone viewport (390 px, DPR 2) idle **12.3% busy, 60.2 fps, 0 slow frames**, pointer/touch sweep 28% busy, 60.1 fps, 0 slow frames, scroll 50.7% busy, 56.1 fps, 3 slow frames. (Original canvas hero on the same phone viewport: idle 99.3% busy, 47.2 fps, 14 slow frames.)

With a playing self-hosted video (test clip), desktop CPU x4: idle 11.2% busy, 60 fps, 0 slow frames, pointer sweep 22.3% busy, 60.1 fps, 0 slow frames, scroll 42% busy, 51.3 fps, 6 slow frames; at normal speed idle 3.3%. Video decode is largely off the main thread, so a self-hosted file costs little here; a real H.264 1080p file on real hardware will be hardware-decoded.

## What the measurements say
- **Idle and pointer interaction stay light**: ~11% / ~29.5% main-thread at 4x, 60 fps, zero slow frames, on desktop, Retina and phone viewports. The original canvas hero was at 78% to 100% busy in the same conditions.
- **The neon light is not free.** Controlled experiment (4x): with every travelling light hidden, idle load fell from 10.2% to 3.7% (style work 114.4 ms to 0 ms per 5 s). That is the price of the effect the brief asks for; it is paused offscreen and removed for reduced motion. At normal speed the whole page idles at ~3%.
- **Scrolling is the weak spot and it is not fixed.** At 4x with a 5,000 px/s scripted scroll of a 6,600 px page, 6 frames exceed 33 ms (worst ~100 ms). Isolating suspects did not find one cause: hiding the spine (6 slow frames), hiding all neon light (5), hiding the five heaviest scenes (4) or disabling `content-visibility` (5, and idle load jumps to 36.2%) each moved it by 1 to 3 frames at most. The cost is first-time layout and style of each scene as it enters view. Layer-promotion and containment changes I tried afterwards did **not** help (7 slow frames) and are kept only because they are harmless. A real wheel or touch scroll is slower than this stress test and GPUs rasterise far faster than this software renderer, but that is not demonstrated here.
- **Route transitions are unchanged** (~156 ms median at 4x; one ~89 ms long task on the first hop).
- **Not measured at all:** the YouTube player, real devices, real networks, GPU paint cost.

Reproduce: `scripts/perf/measure.cjs` (see section 5 above); behavioural checks `scripts/perf/home-test.cjs` (YouTube stubbed, 25 checks; `file` mode, 8 checks) and `scripts/perf/site-test.cjs`.


---

# Revision 4: photography system, world map, people, company, contact and scroll choreography (measured; separate from visual approval)

Same harness and conditions as above (software rendering, CPU x4 ~ modest laptop/phone, median of 3). The YouTube player and real devices are still **not** measured; no photographs were added this round (see docs/licences/README.md), so image cost is not measured either.

| Scenario (CPU x4) | Revision 3 | Revision 4 |
|---|---|---|
| Idle 5 s, desktop | 11% busy, 60 fps, 0 slow frames | 14.2% busy, 60.2 fps, 0 slow frames |
| Pointer sweep, desktop | 29.5% busy, 59.9 fps, 0 slow frames | 32.6% busy, 60 fps, 0 slow frames |
| **Scroll whole page, desktop** | 44.5% busy, 51 fps, 6 slow frames | **53% busy, 39.3 fps, 21 slow frames** |
| Idle / pointer / scroll, phone viewport | n/a | 11% busy, 60.2 fps, 0 slow frames / 28.8% busy, 60.1 fps, 0 slow frames / 55.7% busy, 48.5 fps, 10 slow frames |

**Regression, stated plainly:** idle and pointer interaction stay light, but **scrolling the whole page is clearly worse** (slow frames 6 to 21; about 21 React commits per scroll). The cause is the new scroll choreography itself: scenes that react to scroll (capability reveals, tower stage changes with its spring, showroom exhibit changes, evidence scale, people depth, map) do real work while the page moves, and the map and gallery add more elements. The test scroll (about 5,000 px/s on a throttled CPU, software renderer) is harsher than a real wheel or touch scroll, and a GPU will rasterise far faster, but that is not demonstrated here. Candidate fixes, not yet done: stop re-rendering React on stage changes during scroll (write class names directly), cheaper `content-visibility` hints for the map and gallery, and drop the showroom auto-step on touch.

Checks: `scripts/perf/round4-test.cjs` (46), `home-test.cjs` (25), `site-test.cjs` (23): all pass.
