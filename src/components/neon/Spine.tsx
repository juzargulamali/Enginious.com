"use client";

import { useEffect, useRef } from "react";

/**
 * The line that connects every scene. A single light travels along it, tracking the reader: one passive scroll
 * listener, one transform write per frame, nothing while the page is still.
 */
export function Spine() {
  const track = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = track.current;
    const l = light.current;
    if (!el || !l) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      // light sits ~60% down the viewport, clamped to the track
      const y = Math.min(r.height, Math.max(0, window.innerHeight * 0.6 - r.top));
      l.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={track} className="spine" aria-hidden="true">
      <span ref={light} className="spine-light" />
    </div>
  );
}
