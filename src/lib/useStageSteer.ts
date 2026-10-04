"use client";

import { useEffect, useRef, type RefObject } from "react";
import { reducedMotion } from "@/lib/scrollBus";

/**
 * Cursor control for a rotating gallery stage (mouse only; touch and pen are left to swipe/tap). Two cooperating behaviours:
 *
 * 1. HOVER INTENT. Resting on a visible neighbour for HOVER_MS selects it. A pass-through never selects (the timer is cancelled when
 *    the pointer moves to another item or leaves). After any change the stage must "settle" and the pointer must make fresh,
 *    intentional movement (FRESH_PX) before another hover can select, so cards sliding under a stationary cursor can never chain.
 * 2. EDGE STEERING. A dwell inside the outer zones turns the gallery slowly that way. The wide middle is neutral and stops it.
 *    Speed grows towards the outer edge and is capped. Steering ends when the pointer re-enters the middle, leaves the stage, or
 *    goes over a control / the profile (anything matching `ignore`). Hover selection is suspended while steering and settling.
 *
 * No React state is written per frame: a rAF loop runs only while steering, and it calls `step` about once per second at most.
 * Nothing here listens to scroll, so vertical page scrolling is never captured. Disabled for reduced motion (steering) and for
 * devices without a fine pointer and hover.
 */
const HOVER_MS = 300, DWELL_MS = 280, SETTLE_MS = 750, FRESH_PX = 14;
const ZONE = 0.14; // outer 14% on each side steers; the middle 72% is neutral (visible neighbours inside it are hover-selectable)
const MIN_RATE = 0.4, MAX_RATE = 1.15; // steps per second at the zone boundary / at the very edge

export type StageSteer = {
  itemSelector: string;
  /** index of an item element, or -1 */
  indexOf: (el: Element) => number;
  current: () => number;
  select: (i: number) => void;
  step: (dir: 1 | -1) => void;
  /** elements (selector) over which steering and hover selection stay off: controls, profile, headings */
  ignore?: string;
  /** true while something else owns the stage (an open profile, a tour...) */
  paused?: () => boolean;
};

export function useStageSteer(stage: RefObject<HTMLElement | null>, opts: StageSteer) {
  const o = useRef(opts);
  useEffect(() => { o.current = opts; }); // always the latest callbacks, written after render

  useEffect(() => {
    const el = stage.current;
    if (!el || typeof matchMedia === "undefined" || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let hoverT = 0, dwellT = 0, raf = 0, last = 0, acc = 0, dir: 0 | 1 | -1 = 0, pend: 0 | 1 | -1 = 0, speed = 0, lx = 0, ly = 0;
    let settleUntil = 0, fresh = true, ax = 0, ay = 0, over: Element | null = null, steering = false;

    const busy = () => !!o.current.paused?.() || performance.now() < settleUntil;
    const setSteer = (d: 0 | 1 | -1) => { const v = d === 0 ? "" : d > 0 ? "right" : "left"; if ((el.dataset.steer ?? "") !== v) { if (v) el.dataset.steer = v; else delete el.dataset.steer; } };
    const settle = (x: number, y: number) => { settleUntil = performance.now() + SETTLE_MS; fresh = false; ax = x; ay = y; };
    const cancelHover = () => { clearTimeout(hoverT); over = null; };
    const stopSteer = () => { clearTimeout(dwellT); if (steering) settle(lx, ly); dir = 0; pend = 0; speed = 0; steering = false; setSteer(0); if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    const loop = (t: number) => {
      raf = 0;
      if (!dir) return;
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      if (!o.current.paused?.()) {
        acc += dt * speed;
        if (acc >= 1) { acc -= 1; o.current.step(dir); settleUntil = performance.now() + 250; }
      }
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const target = e.target as Element | null;
      const ign = o.current.ignore;
      const blocked = !!(ign && target?.closest(ign));
      const r = el.getBoundingClientRect();
      const u = (e.clientX - r.left) / r.width;
      lx = e.clientX; ly = e.clientY;

      // --- steering ---
      let want: 0 | 1 | -1 = 0;
      if (!blocked && !reducedMotion() && e.clientY >= r.top && e.clientY <= r.bottom) {
        if (u < ZONE) want = -1; else if (u > 1 - ZONE) want = 1;
      }
      if (want === 0) { if (dir || pend) stopSteer(); }
      else {
        const depth = want < 0 ? (ZONE - u) / ZONE : (u - (1 - ZONE)) / ZONE; // 0 at the zone boundary, 1 at the edge
        const v = MIN_RATE + (MAX_RATE - MIN_RATE) * Math.min(1, Math.max(0, depth));
        if (dir !== want && pend !== want) {
          stopSteer();
          pend = want;
          dwellT = window.setTimeout(() => { dir = want; pend = 0; steering = true; last = performance.now(); acc = 0.35; cancelHover(); setSteer(want); if (!raf) raf = requestAnimationFrame(loop); }, DWELL_MS);
        }
        speed = v;
      }
      if (want !== 0) { cancelHover(); return; }

      // --- hover intent ---
      if (!fresh && performance.now() >= settleUntil && Math.hypot(e.clientX - ax, e.clientY - ay) > FRESH_PX) fresh = true;
      const item = !blocked && target ? target.closest(o.current.itemSelector) : null;
      if (!item) { cancelHover(); return; }
      const i = o.current.indexOf(item);
      if (i < 0 || i === o.current.current()) { cancelHover(); return; }
      if (!fresh || busy() || steering) return;
      if (over === item) return; // already counting down on this item
      cancelHover();
      over = item;
      hoverT = window.setTimeout(() => {
        const under = document.elementFromPoint(lx, ly);
        const still = over === item && item.isConnected && !!under && item.contains(under);
        over = null;
        if (!still || busy() || steering) return;
        const j = o.current.indexOf(item);
        if (j >= 0 && j !== o.current.current()) { settle(e.clientX, e.clientY); o.current.select(j); }
      }, HOVER_MS);
    };
    const onLeave = () => { stopSteer(); cancelHover(); };
    const onDown = () => { stopSteer(); cancelHover(); settleUntil = performance.now() + 400; };
    const onVis = () => { if (document.hidden) onLeave(); };

    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerleave", onLeave); el.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVis);
      stopSteer(); cancelHover();
    };
  }, [stage]);
}
