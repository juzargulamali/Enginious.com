"use client";

import { useRef, type ReactNode } from "react";
import { reducedMotion, useScrollProgress } from "@/lib/scrollBus";

/**
 * The project media is a monument standing on the floor. On arrival it stands up: it starts tilted back and a little smaller, then
 * rises to face the reader (rotateX, scale and lift on ONE compositor layer, one transform write per frame, pivoting on its base).
 * Reduced motion: it simply stands, full size.
 */
export function EvidenceFilm({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const el = useRef<HTMLDivElement>(null);
  useScrollProgress(root, (t) => {
    if (!el.current) return;
    if (reducedMotion()) { el.current.style.transform = ""; return; }
    const p = Math.min(1, Math.max(0, (t - 0.16) / 0.3));
    const e = 1 - Math.pow(1 - p, 3);
    el.current.style.transform = `perspective(1800px) translateY(${((1 - e) * 46).toFixed(1)}px) rotateX(${((1 - e) * 22).toFixed(2)}deg) scale(${(0.86 + 0.14 * e).toFixed(3)})`;
  });
  return (
    <div ref={root} className="film-full">
      <span className="film-bloom" aria-hidden="true" />
      <div ref={el} className="film-grow">
        {children}
        <span className="film-refl" aria-hidden="true" />
      </div>
    </div>
  );
}
