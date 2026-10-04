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
const REST_TWIST = 7;
const twistFor = (s: number) => REST_TWIST + Math.sin(Math.PI * (s - Math.floor(s))) * 36;
const tierT = (i: number, s: number, tw: number) => `rotateY(${(-s * 120 + i * tw).toFixed(2)}deg)`;
const orbitT = (s: number) => `rotate(${(-s * 60).toFixed(2)}deg)`;
const tableT = (s: number) => `translate(-50%, 50%) rotateX(76deg) rotateZ(${(s * 120).toFixed(2)}deg)`;

export function TowerSection() {
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const tiers = useRef<HTMLDivElement[]>([]);
  const orbit = useRef<HTMLSpanElement>(null);
  const table = useRef<HTMLSpanElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(LAST);
  const stageRef = useRef(LAST);
  const reduce = useRef(false);
  const manual = useRef(false); // once the visitor takes the controls, scrolling stops steering the tower
  const stepRef = useRef<(now: number) => void>(() => {});
  const sim = useRef({ s: LAST, v: 0, target: LAST, raf: 0, last: 0, drag: null as null | { x: number; s: number; w: number; moved: boolean; t: number; lx: number; v: number } });

  const paint = useCallback((s: number) => {
    const tw = twistFor(s);
    for (let i = 0; i < TIERS; i++) {
      const t = tiers.current[i];
      if (t) t.style.transform = tierT(i, s, tw);
    }
    if (orbit.current) orbit.current.style.transform = orbitT(s);
    if (table.current) table.current.style.transform = tableT(s);
    const idx = clamp(Math.round(s), 0, LAST);
    if (idx !== stageRef.current) { stageRef.current = idx; setStage(idx); }
  }, []);

  const step = useCallback((now: number) => {
    const q = sim.current;
    const dt = Math.min(0.032, (now - q.last) / 1000 || 0.016);
    q.last = now;
    const k = 140, c = 2 * Math.sqrt(k) * 0.92;
    q.v += ((q.target - q.s) * k - q.v * c) * dt;
    q.s += q.v * dt;
    paint(q.s);
    if (Math.abs(q.v) < 0.0008 && Math.abs(q.target - q.s) < 0.0008) { q.s = q.target; q.v = 0; paint(q.s); q.raf = 0; return; }
    q.raf = requestAnimationFrame(stepRef.current);
  }, [paint]);
  useEffect(() => { stepRef.current = step; }, [step]);

  const goTo = useCallback((t: number) => {
    const q = sim.current;
    q.target = clamp(t, 0, LAST);
    if (reduce.current) { q.s = q.target; q.v = 0; paint(q.s); return; }
    if (!q.raf) { q.last = performance.now(); q.raf = requestAnimationFrame(stepRef.current); }
  }, [paint]);

  const userGo = useCallback((t: number) => { manual.current = true; goTo(t); }, [goTo]);

  // As the section moves through view the tower progresses Idea -> Engineering -> Experience. Manual controls always win.
  useScrollProgress(root, (t) => {
    if (t < 0.06 || t > 0.97) manual.current = false; // fully out of view: hand control back to the scroll
    if (manual.current || reducedMotion()) return;
    const target = t < 0.42 ? 0 : t < 0.6 ? 1 : 2;
    if (target !== Math.round(sim.current.target)) goTo(target);
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduce.current = mq.matches;
    const on = () => (reduce.current = mq.matches);
    mq.addEventListener("change", on);
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
    const q = sim.current;
    return () => { mq.removeEventListener("change", on); io.disconnect(); el.removeEventListener("pointermove", move); cancelAnimationFrame(raf); cancelAnimationFrame(q.raf); };
  }, []);

  const down = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const q = sim.current;
    const w = scene.current?.getBoundingClientRect().width ?? 600;
    q.drag = { x: e.clientX, s: q.s, w, moved: false, t: performance.now(), lx: e.clientX, v: 0 };
    manual.current = true;
    cancelAnimationFrame(q.raf); q.raf = 0; q.v = 0;
    scene.current?.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const q = sim.current, d = q.drag;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 4) return;
    d.moved = true;
    const now = performance.now();
    d.v = (e.clientX - d.lx) / Math.max(1, now - d.t); d.lx = e.clientX; d.t = now;
    let s = d.s - dx / (d.w * 0.52);
    if (s < 0) s *= 0.25;
    if (s > LAST) s = LAST + (s - LAST) * 0.25;
    q.s = s; paint(s);
  };
  const up = (e: React.PointerEvent) => {
    const q = sim.current, d = q.drag;
    q.drag = null;
    if (scene.current?.hasPointerCapture(e.pointerId)) scene.current.releasePointerCapture(e.pointerId);
    if (!d || !d.moved) return;
    goTo(Math.round(clamp(q.s - d.v * 0.9, 0, LAST)));
  };
  const key = (e: React.KeyboardEvent) => {
    const cur = Math.round(sim.current.target);
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
            {Array.from({ length: TIERS }).map((_, i) => (
              <div key={i} ref={(el) => { if (el) tiers.current[i] = el; }} className="tier" style={{ ["--i" as string]: i, transform: tierT(i, LAST, REST_TWIST) }}>
                <div className="face f0" /><div className="face f1" /><div className="face f2" />
              </div>
            ))}
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
