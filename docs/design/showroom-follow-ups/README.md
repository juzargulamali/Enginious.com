# Showroom and map follow-ups

Screenshots use STAND-IN assets (a wide, a tall and a square transparent product, an animated WebP, and a 70-character name), uploaded through the CMS by `scripts/test/showroom-visual-e2e.cjs`. They are not the company's real product images; check the preview with the real ones.

- Homepage showroom: only technologies starred in Technologies ("In the homepage showroom"), in Display order; none starred = the built-in six. Apply order to live site after changing.
- Technologies page showroom: uses the showroom image, size (%) and height offset, plays the uploaded animation on the selected exhibit only, and has the homepage interactions (hover and edge steering with a mouse, swipe, arrow keys, click). Seven exhibits at a time on desktop, three on phones. An empty category shows a message and disabled arrows.
- Long names: labels show two (homepage) or three lines with an ellipsis; the full name is in the panel below.
- Map: projects are listed from their published Location text, with common spelling variants (`src/content/mapMatch.ts`); other places and spellings are added in Site settings, Extra map locations. `src/lib/mapMatch.test.ts` prints every published project location and the place it lands on.
- Photographs: always uploaded in Media. Drive thumbnails only serve as the fallback poster for a Drive VIDEO; they do not make a Drive image link work.
