# Video previews (Work, Technologies) and Contact regional photographs

No Supabase migration is needed: the new settings live inside each item's existing JSON content (content_items.draft / content_published.data).

## CMS fields (Projects and Technologies, group "Video")
Main video (YouTube link or direct video file), Card preview start (default 0 s), Card preview length (default 10 s, 3 to 60), Video poster image, Separate preview video (advanced, optional; direct file only). One link feeds both the card preview and the full player.
Supported links: YouTube (watch, youtu.be, embed, shorts; public or unlisted) and direct https files (.mp4, .webm, .m4v, .mov). SharePoint, OneDrive and Google Drive sharing pages are refused in the editor with a message: they are sign-in/preview pages, not video files.
Poster order: Video poster, then the project/technology's first image, then the YouTube thumbnail, then a designed placeholder.

## Listing cards
- Image first. Desktop hover (after 250 ms) or keyboard focus on a card plays a muted preview of the chosen segment and repeats it while the card stays active. A visible Preview / Stop button works for touch, keyboard and reduced motion (reduced motion gets no automatic preview).
- One preview player in the whole listing. Nothing is created at page load; the YouTube API is fetched only when the first preview starts. The player is removed on leave, scrolling off screen, hidden tab or when another card takes over.
- YouTube uses the official IFrame API (player at least 200 x 200, controls and branding not removed beyond what the API offers, video never extracted). Segment looping is a seek back to the start time when the segment ends, so a short pause at each restart can happen; it is not seamless. Sound is never enabled in previews.
- Direct files use a normal muted video element starting at the start time and looping the segment. Limiting playback to a segment does NOT limit what the browser downloads (it may fetch more than the segment). A separate short preview file avoids that.
- Failures (missing/blocked video, a YouTube player that never starts within 5 s) leave the poster in place.

## Detail pages
`/work/<project>` (case studies) and `/technologies/<technology>` (detailed technologies) show the full player in the page: poster and a Play control, no modal and no extra button. Play loads the privacy-enhanced YouTube player (or the browser's own player for a file) with controls and sound; preview start/length never apply to it. Projects or technologies without a detail page show video only as a card preview.

## Contact regional cards
Regions and offices > a region > "Contact card": title, subtitle and photograph (media library; alt text and focal point are edited there; originals stay in the private bucket). Built-in defaults are the three supplied photographs (originals in assets/originals/regions/), shown with the "Illustrative image" label because they are stock/supplied. Card: 3:2 landscape, three across on desktop, stacked full width on phones; subtle gradient only behind the label; artwork hides while a photograph is assigned and returns if it fails.

## Verification
Real vs stub is stated in scripts/perf/video-preview-test.cjs: the sandbox cannot reach YouTube, so the YouTube API/embeds are stubbed (our management logic is tested, not YouTube itself); direct video is a REAL video element on a local file with Range support. CMS flows run against the local stand-ins (scripts/test/video-region-e2e.cjs).
