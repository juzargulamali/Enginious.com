"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * One passive scroll/resize listener for the whole page, coalesced to one animation frame.
 * Subscribers run in two phases (all reads, then all writes) so several scenes never cause layout thrash.
 * A subscriber returns a write function, or nothing when it has no work (e.g. its element is far offscreen).
 */
type Read = () => (() => void) | void;
const subs = new Set<Read>();
let raf = 0;
let bound = false;

function tick() {
  raf = 0;
  const writes: (() => void)[] = [];
  subs.forEach((r) => { const w = r(); if (w) writes.push(w); });
  writes.forEach((w) => w());
}
const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

export function subscribeScroll(read: Read): () => void {
  subs.add(read);
  if (!bound) { window.addEventListener("scroll", kick, { passive: true }); window.addEventListener("resize", kick, { passive: true }); bound = true; }
  kick();
  return () => {
    subs.delete(read);
    if (!subs.size && bound) { window.removeEventListener("scroll", kick); window.removeEventListener("resize", kick); bound = false; }
  };
}

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const isNarrow = () => typeof window !== "undefined" && window.innerWidth < 900;

/** 0 when the element's top enters the bottom of the viewport, 1 when its bottom leaves the top. */
export function passProgress(r: DOMRect, vh: number) { return clamp((vh - r.top) / (vh + r.height)); }

/** Calls `onProgress(t)` whenever the element is within ~1 screen of the viewport. No React state per frame. */
export function useScrollProgress(ref: RefObject<HTMLElement | null>, onProgress: (t: number, rect: DOMRect) => void, deps: unknown[] = []) {
  const cb = useRef(onProgress);
  useEffect(() => { cb.current = onProgress; });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return subscribeScroll(() => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) return;
      return () => cb.current(passProgress(r, vh), r);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** True once the element's top has passed `line` (fraction of viewport height) on its way up, i.e. the travelling light reached it. */
export function useReached(ref: RefObject<HTMLElement | null>, line = 0.66) {
  const [reached, setReached] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) { const t = window.setTimeout(() => setReached(true), 0); return () => window.clearTimeout(t); }
    return subscribeScroll(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * line) return () => setReached(true);
    });
  }, [ref, line]);
  return reached;
}
