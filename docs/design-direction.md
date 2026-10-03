# Design direction (homepage, revision 3: "a continuous digital world")

Feedback that drove this revision: the previous homepage was dark panels with a tower; it did not match the supplied renders (cinematic scenes, luminous edges, portrait-card depth, an immersive showroom). Direction now:

## 1. The showreel is the opening
Full-bleed cinematic hero: the approved Enginious showreel plays as a muted, looping background with clear copy, a strong "Start a project" button, a "Watch the showreel" button (opens it with sound in an accessible lightbox) and region chips (Dubai HQ / Saudi Arabia / Poland · Europe).

Restrained interactivity around the footage: pointer-driven light, three layers of parallax depth (mouse only), a HUD frame with corner brackets and light that travels around its edges. Footage stays readable (shade gradients only where text sits).

- **File mode (best):** drop `showreel.mp4` (+ optional `.webm`, `showreel-mobile.mp4`, `showreel-poster.jpg`) in `public/video/`; detected at build time. See `public/video/README.md`.
- **YouTube mode (now):** `OtAjMig32ZE` embedded privacy-enhanced (youtube-nocookie), muted loop, started after first paint, only when motion is acceptable. Poster = the video's thumbnail. The second film (`YYEiNgZXd3w`) sits in the Evidence scene behind a click-to-play facade (no player code loads until pressed).
- **Never empty:** a designed stage (light cones, ring, columns, floor) renders under the poster, so the hero is composed even when footage is blocked or still loading.
- **Phone:** the video sits on top (62% of the screen) with the headline starting inside the first screen; pause control over the video; poster only for Save-Data / 2G-3G / reduced motion.

## 2. One connected world
- **The spine:** a vertical neon line runs the length of the page. A light travels along it tracking the reader (one scroll listener, one transform per frame). Every scene hangs from it by a node and a branch trace that leads into its heading, so one scene flows into the next.
- **Edge light with variety:** four edge treatments, so panels do not share one outline: `perimeter` (hero HUD, closing panel, first portal), `top`, `left`, `bottom-right`, `brackets`. Light runs top → right → bottom → left.
- **Routed traces:** circuit-style paths (orthogonal with 45° bends, like the logo) with a pulse travelling along them. On the map it runs Dubai → Riyadh → Poland. Hover / tap sends an extra, faster pulse.
- **Shared elements:** the same circuit/trace vocabulary, form drawings, floor-light and HUD brackets recur from hero to footer.

## 3. Scenes (each a different composition)
1. **What we deliver:** three tall "portal" cards at staggered heights, large form drawings, a lit floor, pointer lean + light; each with its own edge treatment. Supporting capabilities in a ruled row.
2. **Engineering experiences:** the Kinetic Tower, moved here and enlarged. Stage panels on the left (Idea / Engineering / Experience) list what Enginious provides at each stage, from the services in the brief; turning the tower (drag, swipe, arrows, panels) changes the active panel.
3. **Technologies:** a lit showroom with six distinct exhibits, reflections and light cones; hover/tap reads what it is; add to the project brief.
4. **Evidence:** outlined numerals ("16", "5"), a film facade, a reel of cards with HUD corner brackets.
5. **People:** large cards in perspective, receding neighbours, floor ring, drag/arrows. No portraits are invented: cards show disciplines (and the two leaders' initials); approved photography replaces the form drawing on the card with no other change.
6. **Global presence:** real-geography map, offices solid and project locations hollow, pulse along the office route; clear Dubai HQ / Saudi Arabia branch / Poland branch serving Europe with per-region "Start a project".
7. **Close:** perimeter-lit panel and the primary call to action.

## 4. Reference: personal website
Adopted from `juzargulamali.com`: motion only while on screen, a shared scroll approach, ambient video that waits for the viewport and respects Save-Data / slow networks, click-to-play films, reduced-motion handling, and a pause control. Not adopted: its preview renders (they state they must never depict delivered projects).

## 5. Rules (apply to every page)
Transform/opacity-only motion on small layers; no canvas loops, no `filter`, no `backdrop-filter`; one write per frame for pointer effects, mouse only; everything pauses offscreen; reduced motion removes travelling light and parallax but keeps all lines and content; no scroll hijacking.
