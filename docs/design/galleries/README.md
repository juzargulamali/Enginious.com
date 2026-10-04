# Galleries, team page and hero (branch `claude/gallery-showroom-team`)

## Galleries
- Homepage showroom and the team gallery are full width with hover-to-select, edge steering, swipe, arrows and keyboard (`src/lib/useStageSteer.ts`).
- `TeamGallery` is now one shared full-width component used by the homepage and `/company/team` (filters, list alternative, profiles and leadership messages unchanged; no second list under the gallery).
- Neighbour names: the card no longer fades as a whole. A dark overlay under the caption dims the portrait/background, the words stay bright (white name, light role), and right-hand neighbours align their text to their visible outer side.
- Arrows on tablet/phone (up to 900px) sit together in their own strip below the cards, 52px targets, never over a photo, name or role. Phones leave out the cut-off captions of the glimpsed neighbours.

## Hero video: findings
The hero plays the **YouTube embed** (`OtAjMig32ZE`, privacy-enhanced). No `showreel.mp4` is configured, so file mode is not in use.
- Measured (`scripts/perf/hero-video-test.cjs`): the real homepage with the embed replaced by a local 1080p clip in a real video element. Dropped video frames and page frame pacing at idle, during a pointer sweep and while scrolling through the hero, at CPU x1, x4, x6 and x8, desktop and phone: **0 dropped frames, page at 57 to 60 fps**, with and without the page's own effects (video-layer parallax, spotlight, copy layer). So overlapping effects on this page are not what limits playback in this test.
- Not measurable here: the YouTube stream itself (the sandbox cannot reach YouTube). Remaining suspects, unverified: YouTube's adaptive 1080p stream chosen for a roughly 1800px wide frame (decoder cost on the visitor's machine), cold start and buffering of the player, and the loop seam (`loop=1&playlist` restarts the clip through the player).
- Changed as a precaution, with no visual change: the video layer is no longer moved by pointer parallax (it was a cross-origin iframe re-positioned on every mouse move). Text and HUD layers keep their subtle depth. This did not change the measured numbers; its benefit on a real GPU is unproven.
- Off-screen: confirmed it pauses when the hero leaves the viewport (below 15% visible) and resumes on return. Nothing loads for reduced motion, Save-Data or 2G/3G.
- To remove the YouTube dependency and the loop seam: export **`showreel.mp4`** (H.264, 1920x1080, 24 or 30 fps, no audio needed, 15 to 30 s seamless loop, at most 12 MB) plus optional `showreel-mobile.mp4` (1280x720, at most 5 MB) and `showreel-poster.jpg`, from the original edit, and set the file address in the CMS Video settings. The code already supports this and the sound control works with it. The YouTube link cannot be re-exported at better quality than YouTube serves.

## Sound control
Muted start. A button appears only after the player has reported its mute state, and its label ("Unmute video" / "Mute video") always follows that reported state. Uses the YouTube player's `mute` / `unMute` / `setVolume` commands (or the video element in file mode). The showreel lightbox mutes the background first and the background is never unmuted automatically. Stacked above the pause button on desktop (lifted above the regional strip below 1420px), beside it on phones.

## Checks
`gallery-test.cjs` (home + team page, 390/430/768), `hero-sound-test.cjs`, `home-test.cjs`, unit tests, tsc, eslint, CMS e2e.
