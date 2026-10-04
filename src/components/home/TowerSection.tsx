"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Edge } from "@/components/neon/Edge";
import { reducedMotion, useScrollProgress } from "@/lib/scrollBus";

/**
 * KINETIC TOWER inside the "Engineering experiences" scene.
 * Six tiers, each a triangular prism with three surfaces (Idea blueprint, Engineering circuit, Experience lit content).
 * Turning the tower (drag / swipe / arrow keys / the stage panels) twists the tiers, then locks them into a wall,
 * and the panel beside it explains what Enginious provides at that stage.
 * Performance: transform writes straight onto eight elements, no canvas, no filters; no loop while idle.
 */

const STAGES = [
  {
    key: "idea", n: "01", label: "Idea", title: "It starts with an idea.",
    body: "We shape what people should feel and do before anything is built.",
    list: ["Experience strategy and creative development", "Digital content creation: 2D and 3D"],
    href: "/solutions", cta: "See solutions", edge: "top" as const, tags: ["Brief", "Concept", "Storyboard"],
  },
  {
    key: "engineering", n: "02", label: "Engineering", title: "Then we engineer how it moves.",
    body: "Mechatronics, software, content and integration, developed together by one team.",
    list: ["Engineering and bespoke technology development", "Hardware and software integration", "Interactive software and applications"],
    href: "/technologies", cta: "Explore technologies", edge: "left" as const, tags: ["Mechatronics", "Software", "Integration"],
  },
  {
    key: "experience", n: "03", label: "Experience", title: "Then people step inside.",
    body: "Installed, operated and supported on show floors and in permanent spaces.",
    list: ["Events, exhibitions and brand activations", "Experience centres and permanent installations", "Installation, operation, maintenance and support"],
    href: "/work", cta: "See delivered work", edge: "bottom-right" as const, tags: ["Install", "Operate", "Support"],
  },
];

const LAST = STAGES.length - 1;
const TIERS = 6;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
// Tiers keep a small helical offset at rest; mid-drag they lag behind each other further, then lock aligned on release.
const REST_TWIST = 7;
const twistFor = (s: number) => REST_TWIST + Math.sin(Math.PI * (s - Math.floor(s))) * 36;
// One 3D context, 18 faces placed directly (no per-tier preserve-3d groups: those each created a render surface that
// software compositing had to redraw every frame). Face = rotateY(tier angle + face offset) translateZ(apothem).
const faceT = (i: number, k: number, s: number, tw: number) => `rotateY(${(-s * 120 + i * tw + k * 120).toFixed(2)}deg) translateZ(var(--ap))`;
const orbitT = (s: number) => `rotate(${(-s * 60).toFixed(2)}deg)`;
const tableT = (s: number) => `translate(-50%, 50%) rotateX(76deg) rotateZ(${(s * 120).toFixed(2)}deg)`;

/**
 * PERFORMANCE: there is no JavaScript animation loop. A stage change writes the eight target transforms ONCE and CSS
 * transitions (compositor-driven; per-tier delays give the travelling twist) do the motion. Only an active drag writes
 * transforms per pointer frame, with transitions switched off for the duration.
 */
export function TowerSection() {
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const faces = useRef<HTMLDivElement[]>([]);
  const orbit = useRef<HTMLSpanElement>(null);
  const table = useRef<HTMLSpanElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(LAST);
  const stageRef = useRef(LAST);
  const target = useRef(LAST);
  const manual = useRef(false); // once the visitor takes the controls, scrolling stops steering the tower
  const drag = useRef<null | { x: number; s: number; w: number; moved: boolean; t: number; lx: number; v: number; cur: number }>(null);

  const paint = useCallback((s: number) => {
    const tw = twistFor(s);
    for (let i = 0; i < TIERS; i++) for (let k = 0; k < 3; k++) { const f = faces.current[i * 3 + k]; if (f) f.style.transform = faceT(i, k, s, tw); }
    if (orbit.current) orbit.current.style.transform = orbitT(s);
    if (table.current) table.current.style.transform = tableT(s);
    const idx = clamp(Math.round(s), 0, LAST);
    if (idx !== stageRef.current) { stageRef.current = idx; setStage(idx); }
  }, []);

  const goTo = useCallback((t: number) => {
    target.current = clamp(t, 0, LAST);
    paint(target.current);
  }, [paint]);
  const userGo = useCallback((t: number) => { manual.current = true; goTo(t); }, [goTo]);

  // As the section moves through view the tower progresses Idea -> Engineering -> Experience. Manual controls always win.
  useScrollProgress(root, (t) => {
    if (t < 0.06 || t > 0.97) manual.current = false;
    if (manual.current || reducedMotion() || drag.current) return;
    const next = t < 0.42 ? 0 : t < 0.6 ? 1 : 2;
    if (next !== target.current) goTo(next);
  });

  useEffect(() => {
    const el = root.current!;
    const io = new IntersectionObserver(([e]) => { el.toggleAttribute("data-paused", !e.isIntersecting); el.toggleAttribute("data-live", e.isIntersecting); }, { rootMargin: "120px 0px" });
    io.observe(el);
    let raf = 0, px = 0, py = 0;
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 2 - 1; py = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (wrap.current) wrap.current.style.transform = `rotateX(${(-6 - py * 2).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg)`; });
    };
    el.addEventListener("pointermove", move, { passive: true });
    return () => { io.disconnect(); el.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, []);

  const down = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const w = scene.current?.getBoundingClientRect().width ?? 600;
    manual.current = true;
    drag.current = { x: e.clientX, s: target.current, w, moved: false, t: performance.now(), lx: e.clientX, v: 0, cur: target.current };
    scene.current?.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved) { if (Math.abs(dx) < 4) return; d.moved = true; root.current?.setAttribute("data-drag", ""); }
    const now = performance.now();
    d.v = (e.clientX - d.lx) / Math.max(1, now - d.t); d.lx = e.clientX; d.t = now;
    let s = d.s - dx / (d.w * 0.52);
    if (s < 0) s *= 0.25;
    if (s > LAST) s = LAST + (s - LAST) * 0.25;
    d.cur = s; paint(s);
  };
  const up = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (scene.current?.hasPointerCapture(e.pointerId)) scene.current.releasePointerCapture(e.pointerId);
    root.current?.removeAttribute("data-drag");
    if (!d || !d.moved) return;
    goTo(Math.round(clamp(d.cur - d.v * 0.9, 0, LAST)));
  };
  const key = (e: React.KeyboardEvent) => {
    const cur = Math.round(target.current);
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); userGo(cur + 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); userGo(cur - 1); }
    else if (e.key === "Home") { e.preventDefault(); userGo(0); }
    else if (e.key === "End") { e.preventDefault(); userGo(LAST); }
  };

  const cur = STAGES[stage];

  return (
    <div ref={root} className="tw" data-stage={stage}>
      <div className="tw-bg" aria-hidden="true"><span className="glow g0" /><span className="glow g1" /><span className="glow g2" /><span className="beam b1" /><span className="beam b2" /></div>
      <div className="tw-panels" role="group" aria-label="From idea to experience">
        {STAGES.map((s, i) => (
          <div key={s.key} className="tw-panel" data-on={i === stage} data-trace-scope>
            {i === stage && <Edge variant={s.edge} duration={8} />}
            <button type="button" className="tw-head" aria-expanded={i === stage} aria-controls={`tw-body-${s.key}`} onClick={() => userGo(i)}>
              <span className="n">{s.n}</span>
              <span className="l">{s.label}</span>
              <span className="chev" aria-hidden="true">{i === stage ? "−" : "+"}</span>
            </button>
            <div id={`tw-body-${s.key}`} className="tw-body" hidden={i !== stage}>
              <p className="tw-title">{s.title}</p>
              <p className="tw-text">{s.body}</p>
              <ul>{s.list.map((l) => <li key={l}>{l}</li>)}</ul>
              <Link href={s.href} className="tw-link">{s.cta} →</Link>
            </div>
          </div>
        ))}
      </div>

      <div
        ref={scene}
        className="tw-scene"
        role="slider"
        tabIndex={0}
        aria-label="Turn the tower from idea to engineering to experience"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={LAST}
        aria-valuenow={stage}
        aria-valuetext={cur.label}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      >
        <span className="tw-floor" aria-hidden="true" />
        <span className="tw-far" aria-hidden="true"><i className="fm fm1" /><i className="fm fm2" /><i className="fm fm3" /><i className="fm fm4" /></span>
        <span className="tw-cast" aria-hidden="true" />
        <span className="tw-plinth" aria-hidden="true"><i className="pl pl3" /><i className="pl pl2" /><i className="pl pl1" /></span>
        <span ref={orbit} className="orbit" aria-hidden="true" style={{ transform: orbitT(LAST) }}>
          <svg viewBox="0 0 400 400"><circle cx="200" cy="200" r="186" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="540 70 260 40" strokeLinecap="round" /></svg>
        </span>
        <span className="pool" aria-hidden="true" />
        <span ref={table} className="turntable" aria-hidden="true" style={{ transform: tableT(LAST) }}>
          <svg viewBox="0 0 400 400">
            <g fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="200" cy="200" r="196" opacity=".7" /><circle cx="200" cy="200" r="150" opacity=".35" /><circle cx="200" cy="200" r="104" opacity=".25" /></g>
            <g stroke="currentColor" strokeWidth="2">{Array.from({ length: 36 }).map((_, i) => <path key={i} d={`M200 ${i % 3 === 0 ? 2 : 8} V16`} transform={`rotate(${i * 10} 200 200)`} opacity={i % 3 === 0 ? 0.9 : 0.4} />)}</g>
          </svg>
        </span>
        <div ref={wrap} className="tower-wrap" aria-hidden="true">
          <div className="tower">
            {Array.from({ length: TIERS * 3 }).map((_, n) => {
              const i = Math.floor(n / 3), k = n % 3;
              return <div key={n} ref={(el) => { if (el) faces.current[n] = el; }} className={`face f${k}`} style={{ ["--i" as string]: i, transform: faceT(i, k, LAST, REST_TWIST) }} />;
            })}
          </div>
        </div>
        <ul className="annots" aria-hidden="true">
          {STAGES.map((s, i) => (
            <li key={s.key} data-on={i === stage}>{s.tags.map((t, k) => <span key={t} className={`tag t${k}`}>{t}</span>)}</li>
          ))}
        </ul>
        <p className="hint" aria-hidden="true"><span className="dragicon">⟷</span> Drag to turn the tower</p>
      </div>
    </div>
  );
}
