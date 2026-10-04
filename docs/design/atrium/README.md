# Digital Atrium exploration, round 3: environmental depth (capabilities demo)

The previous "Enginious World" treatment was rejected. This branch is now main's homepage layout and interactions, plus:
- the reliable poster fallback (`YtPoster`, used by the hero and the film facade);
- one demonstration of the new direction on the capabilities section only: `CapabilityEnv` + the "environmental depth layer" block at the end of `home.css`.

The layer is static and sits behind the content (cards, tower, hero, neon lines and team gallery are main's). It has near-black edge shading,
a recessed pool of teal light, and three dark forms at different depths (far small and dim, mid, near large and cropped), placed clear of the cards.
No script, animation, filters or extra compositor layers. Cards, links and the foreground are unchanged. Mobile hides the mid form so it never crosses the heading.

Screenshots: `capabilities/{desktop,mobile}-after.png`. To revert: remove `<CapabilityEnv />` from `page.tsx`.
Not extended to other sections yet, pending review.
