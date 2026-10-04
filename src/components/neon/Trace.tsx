"use client";

import { useEffect, useRef } from "react";

type Pt = [number, number];

/**
 * A routed circuit trace (orthogonal with 45-degree bends, as in the logo) with light travelling along it.
 * Coordinates are in a viewBox; the container keeps that aspect ratio so the light (a Web Animations transform,
 * which runs on the compositor) lands exactly on the line at any size. Pauses offscreen; reacts to pointer / touch
 * by sending an extra, faster pulse. `nodes` marks junction points.
 */
export function Trace({
  points,
  w = 1000,
  h = 300,
  duration = 6500,
  delay = 0,
  nodes = [],
  reactive = true,
  className = "",
}: {
  points: Pt[];
  w?: number;
  h?: number;
  duration?: number;
  delay?: number;
  nodes?: number[];
  reactive?: boolean;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const d = "M" + points.map((p) => p.join(" ")).join(" L");

  useEffect(() => {
    const el = box.current;
    const dt = dot.current;
    if (!el || !dt || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // cumulative lengths for even speed along the path
    const seg = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
    const total = seg.reduce((a, b) => a + b, 0);
    let anim: Animation | null = null;
    let live = false;
    let pulse: Animation | null = null;

    const frames = () => {
      const sx = el.clientWidth / w;
      const sy = el.clientHeight / h;
      let acc = 0;
      const f: Keyframe[] = [{ transform: `translate(${points[0][0] * sx}px, ${points[0][1] * sy}px)`, offset: 0, opacity: 0 }];
      points.slice(1).forEach((p, i) => {
        acc += seg[i];
        f.push({ transform: `translate(${p[0] * sx}px, ${p[1] * sy}px)`, offset: acc / total, opacity: 1 });
      });
      f[1].opacity = 1;
      f[f.length - 1].opacity = 0;
      return f;
    };
    const build = () => {
      const t = anim?.currentTime ?? 0;
      anim?.cancel();
      if (!el.clientWidth) return;
      anim = dt.animate(frames(), { duration, delay, iterations: Infinity, easing: "linear" });
      anim.currentTime = (typeof t === "number" ? t : 0) + 0;
      if (!live) anim.pause();
    };
    build();

    const io = new IntersectionObserver(([e]) => {
      live = e.isIntersecting;
      if (!anim) return;
      if (live) anim.play();
      else anim.pause();
    });
    io.observe(el);
    const ro = new ResizeObserver(build);
    ro.observe(el);

    const burst = () => {
      if (pulse && pulse.playState === "running") return;
      const clone = dt.cloneNode() as HTMLSpanElement;
      clone.style.opacity = "1";
      el.appendChild(clone);
      pulse = clone.animate(frames(), { duration: duration * 0.35, easing: "ease-in", fill: "both" });
      pulse.onfinish = () => clone.remove();
    };
    const scope = el.closest("[data-trace-scope]") ?? el;
    if (reactive) {
      scope.addEventListener("pointerenter", burst as EventListener);
      scope.addEventListener("pointerdown", burst as EventListener);
    }
    return () => {
      io.disconnect();
      ro.disconnect();
      anim?.cancel();
      scope.removeEventListener("pointerenter", burst as EventListener);
      scope.removeEventListener("pointerdown", burst as EventListener);
    };
  }, [points, w, h, duration, delay, reactive]);

  return (
    <div ref={box} className={`trace ${className}`} style={{ aspectRatio: `${w} / ${h}` }} aria-hidden="true">
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={d} />
      </svg>
      {nodes.map((i) => (
        <span key={i} className="tr-node" style={{ left: `${(points[i][0] / w) * 100}%`, top: `${(points[i][1] / h) * 100}%` }} />
      ))}
      <span ref={dot} className="tr-dot" />
    </div>
  );
}
