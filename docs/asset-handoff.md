# Image asset handoff

No image generation is available in the build environment, so every slot below is empty and shows the designed (unlabelled) fallback. Nothing generated is committed. Supply files as below; the registry entry, focal point, alt text and status are then set with `scripts/images/ingest.mjs` (see its header) or in the CMS (`media_assets`).

General: sRGB, JPEG or PNG at least the stated size (the script writes 480/960/1600 px WebP). Keep the subject inside the "safe area" because the layout crops with `object-position` from the focal point. No text, logos or watermarks in the image. Until a photo is a real Enginious project, mark it `concept` (environments) or `fictional-portrait` (people), or `stock` with a licence record. Replace every non-`real` image before launch.

| Slot (`SLOTS` key) | Registry id / file stem | Size (min) | Aspect | Where it shows | Description / safe area |
|---|---|---|---|---|---|
| `capEvents` | `events-exhibitions` -> `public/photos/events-exhibitions-*.webp` | 1600 x 2080 | 3:4 portrait (shown at about 360 x 480, cropped by cover; darkened toward the bottom) | Capability card 01, Events, exhibitions and activations | A busy exhibition stand or activation with interactive screens and people engaging. Dark, teal-lit if possible. Keep the focal subject in the upper 60%; the bottom is covered by text. |
| `capCentres` | `immersive-installations` | 1600 x 2080 | 3:4 | Capability card 02, Experience centres | An immersive experience-centre room: wall-to-floor projection or a large interactive table, visitors in frame. Focal subject upper 60%. |
| `capPermanent` | `interactive-technology` | 1600 x 2080 | 3:4 | Capability card 03, Permanent installations | A finished permanent installation (kinetic display, interactive wall, lobby feature). Focal subject upper 60%. |
| `contactScene` | `contact-scene` | 2400 x 1000 | 12:5 landscape (shown full width, 560 px tall, faded to black toward the bottom) | Contact page background | A wide dark immersive environment (stage, showroom or gallery of light), no faces in the left third where the headline sits. Brightest detail on the right. |
| Showreel files (not an image slot) | `public/video/showreel-poster.jpg`, `showreel.mp4`, `showreel-mobile.mp4` | 1920 x 1080 still; MP4 H.264 1920 x 1080 muted loop 15-30 s, at most 12 MB; mobile 1280 x 720 or 9:16, at most 5 MB | 16:9 | Home hero poster and background video; used for Reduced motion and no-video visitors. Without these the hero uses the YouTube thumbnail and a play button | A frame from the showreel. Text sits bottom-left, so keep it darker there. Video is hosted, never committed to git beyond what the owner approves. |
| `previewMale` | `preview-portrait-male` | 1200 x 1660 | 3:4.15 (cards are 3 : 4.15) | Team gallery cards for male-named people with no supplied photo, by role only | A neutral studio or office portrait, head and shoulders, face in the upper half, dark background. Status `preview-portrait` or `fictional-portrait`; never labelled as a real person. |
| `previewFemale` | `preview-portrait-female` | 1200 x 1660 | 3:4.15 | As above for female-named people | As above. |
| `leaderCEO` | `juzar-gulamali` | already supplied (1122 x 1402) | about 4:5 | Team, Company, Home people | Done. Real, supplied. |

Per-person portraits: a real photo per team member is the target. Name the file `person-<slug>.jpg` (for example `person-rafi-ullah.jpg`), 1200 x 1660, 3:4.15, face in the upper half, then register with `--status real` and point `LEADERS[<id>].photo` (or the team data) at it.

## How to add one

```
node scripts/images/ingest.mjs events-exhibitions ./events.jpg --kind scene --status concept \
  --alt "Visitors using an interactive display on an exhibition stand" --focal 0.5,0.35 \
  --licence "<licence>" --source "<where from>" --credit "<who>"
```
Paste the printed entry into `src/content/images.ts` (or the generated JSON). The slot already points at the id, so the page switches from fallback to photo.
