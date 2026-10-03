# Design direction (Milestone 1 revision)

## The idea: one machine that tells the story
Enginious builds **kinetic systems**: stacked triangular screens that rotate, lock into a wall, and twist apart again (Tri-Helix). The website's hero *is* one of those systems, so the identity comes from what the company really makes rather than from decoration.

**Signature interaction: the Kinetic Tower.** Six tiers, each a triangular prism with three surfaces:
1. **Idea**: a blueprint (construction geometry, dimension lines).
2. **Engineering**: a circuit board (the traces and pads echo the logo).
3. **Experience**: lit LED content.

Visitors drag, swipe, press ←/→ or use the *01 Idea · 02 Engineering · 03 Experience* stepper. The tiers turn with a travelling twist, then lock into an aligned wall, exactly how the real structure behaves. The copy beside it changes with the surface, so one gesture explains what Enginious does: idea → engineering → delivered experience.

Why this and not a particle field / shader: it is recognisably *Enginious* (kinetic triangular screens), it explains the business, and it can be built from GPU-composited CSS transforms, which is the only approach that stays smooth on laptops and phones (see `docs/performance.md`).

## Design language (to extend to every page)
- **Scene, not boxes.** Pages are composed as lit spaces with a floor, a light source and objects with depth; copy sits in the scene, not in rectangles.
- **Brand motifs from the logo:** the circle-and-trace mark becomes the orbit ring, the circuit traces that run behind the hero and into the page, and the pads used as nodes (map, story timeline).
- **One connecting line.** A signal trace links sections (hero traces → story timeline → map routes).
- **Type as structure:** very large Sora headlines, outlined numerals for evidence, mono micro-labels for metadata.
- **Distinct forms per technology** (`TechForm`): each is drawn from the profile's description of that technology (rotating triangles, arc panels, double helix, sliding panels, rotary dial, robotic arm, holofan blades, ...), so the showroom can use them next.
- **Colour:** brand cyan `#27CDD8` on near-black, deep teal `#26798D` for depth, a cooler blue appears only for the "Idea" stage.
- **No decoration that costs frames:** no canvas, no filters, no backdrop-blur, no fixed backgrounds.

## Accessibility and fallbacks
- Real slider semantics on the tower (`role="slider"`, arrow/Home/End keys), real buttons for the stepper, live-region copy.
- `prefers-reduced-motion`: no sway, no spring; changes are instant. The hero is plain HTML+CSS, so with JavaScript off or failed it renders the aligned "Experience" wall (the static fallback). There is no error state for the hero.
- Mobile: tower below the headline, swipe to turn (vertical scroll is never blocked), stepper full width.
- Below-the-fold sections use `content-visibility: auto` so they cost nothing until needed.

## How the other pages inherit this
- **People:** a larger-scale version of the gallery with the same perspective/lighting language (next).
- **Technologies:** showroom exhibits use `TechForm` (distinct forms) on the same lit floor.
- **Regions:** the map component with the region's offices highlighted.
- **Contact:** the project brief becomes a stage-by-stage planning journey.
