"use client";

import { useRef, type ReactNode } from "react";
import { reducedMotion, useScrollProgress } from "@/lib/scrollBus";

/** Project media takes over more of the composition as the reader reaches the evidence: scale-up on the compositor (one transform write per frame). */
export function EvidenceFilm({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const el = useRef<HTMLDivElement>(null);
  useScrollProgress(root, (t) => {
    if (!el.current) return;
    if (reducedMotion()) { el.current.style.transform = ""; return; }
    const p = Math.min(1, Math.max(0, (t - 0.22) / 0.3));
    const s = 0.8 + 0.2 * p;
    el.current.style.transform = `scale(${s.toFixed(3)})`;
  });
  return (
    <div ref={root} className="film-full">
      <div ref={el} className="film-grow" style={{ transform: "scale(0.8)" }}>{children}</div>
    </div>
  );
}
