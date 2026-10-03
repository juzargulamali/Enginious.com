"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * KINETIC TOWER: the signature interaction.
 * Enginious builds kinetic systems of stacked, rotating triangular screens (Tri-Helix). The hero IS one:
 * six tiers, each a triangular prism whose three faces are an Idea (blueprint), an Engineering (circuit board)
 * and an Experience (lit LED content) surface. Turning the tower (drag / swipe / arrow keys / the stepper)
 * rotates the tiers with a travelling twist, then locks them into an aligned wall, exactly how the real thing behaves.
 *
 * Performance design: no canvas, no filters, no backdrop-filter. The only per-frame work is writing two CSS custom
 * properties (--s, --tw) on one element while the tower is moving; every visual change is a compositor transform.
 * No loop runs while idle, and the decorative sway is a CSS animation that pauses when offscreen.
 */

const STAGES = [
  {
    key: "idea",
    n: "01",
    label: "Idea",
    title: "It starts with an idea.",
    body: "Brief, concept and storyboard. We shape what people should feel and do before anything is built.",
    tags: ["Brief", "Concept", "Storyboard"],
  },
  {
    key: "engineering",
    n: "02",
    label: "Engineering",
    title: "Then we engineer how it moves.",
    body: "Mechatronics, software, content and integration, developed together by one team.",
    tags: ["Mechatronics", "Software", "Integration"],
  },
  {
    key: "experience",
    n: "03",
    label: "Experience",
    title: "Then people step inside.",
    body: "Installed, operated and supported on show floors and in permanent spaces.",
    tags: ["Install", "Operate", "Support"],
  },
] as const;

const LAST = STAGES.length - 1;
const TIERS = 6;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const tierT = (i: number, s: number, tw: number) => `rotateY(${(-s * 120 + i * tw).toFixed(2)}deg)`;
const orbitT = (s: number) => `rotate(${(-s * 60).toFixed(2)}deg)`;
const tableT = (s: number) => `translate(-50%, 50%) rotateX(76deg) rotateZ(${(s * 120).toFixed(2)}deg)`;
// Tiers lag behind each other mid-turn; at rest they keep a small helical offset so the silhouette reads as a twisted tower.
const REST_TWIST = 7;
const twistFor = (s: number) => REST_TWIST + Math.sin(Math.PI * (s - Math.floor(s))) * 36;

export function KineticHero() {
  const hero = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(LAST);
  const stageRef = useRef(LAST);
  const sim = useRef({ s: LAST, v: 0, target: LAST, raf: 0, last: 0, drag: null as null | { x: number; s: number; w: number; moved: boolean; t: number; lx: number; v: number } });
  const reduce = useRef(false);

  const tiers = useRef<HTMLDivElement[]>([]);
  const orbit = useRef<HTMLSpanElement>(null);
  const table = useRef<HTMLSpanElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const traces = useRef<SVGSVGElement>(null);

  // Direct transform writes on 8 elements: no inherited custom properties, so no subtree style invalidation.
  const paint = useCallback((s: number) => {
    const tw = twistFor(s);
    for (let i = 0; i < TIERS; i++) {
      const t = tiers.current[i];
      if (t) t.style.transform = tierT(i, s, tw);
    }
    if (orbit.current) orbit.current.style.transform = orbitT(s);
    if (table.current) table.current.style.transform = tableT(s);
    const idx = clamp(Math.round(s), 0, LAST);
    if (idx !== stageRef.current) {
      stageRef.current = idx;
      setStage(idx);
    }
  }, []);

  const stepRef = useRef<(now: number) => void>(() => {});
  const step = useCallback(
    (now: number) => {
      const q = sim.current;
      const dt = Math.min(0.032, (now - q.last) / 1000 || 0.016);
      q.last = now;
      // critically-damped spring toward the target stage
      const k = 140, c = 2 * Math.sqrt(k) * 0.92;
      q.v += ((q.target - q.s) * k - q.v * c) * dt;
      q.s += q.v * dt;
      paint(q.s);
      if (Math.abs(q.v) < 0.0008 && Math.abs(q.target - q.s) < 0.0008) {
        q.s = q.target;
        q.v = 0;
        paint(q.s);
        q.raf = 0;
        return;
      }
      q.raf = requestAnimationFrame(stepRef.current);
    },
    [paint],
  );
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const goTo = useCallback(
    (t: number) => {
      const q = sim.current;
      q.target = clamp(t, 0, LAST);
      if (reduce.current) {
        q.s = q.target;
        q.v = 0;
        paint(q.s);
        return;
      }
      if (!q.raf) {
        q.last = performance.now();
        q.raf = requestAnimationFrame(stepRef.current);
      }
    },
    [paint],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduce.current = mq.matches;
    const onChange = () => (reduce.current = mq.matches);
    mq.addEventListener("change", onChange);

    const el = hero.current!;
    // Pause the decorative sway when the hero is offscreen (no work while out of view).
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-paused", !e.isIntersecting), { threshold: 0 });
    io.observe(el);

    // Gentle pointer parallax: at most one style write per frame, mouse only.
    let raf = 0;
    let px = 0, py = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 2 - 1;
      py = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (wrap.current) wrap.current.style.transform = `rotateX(${(-6 - py * 2).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg)`;
          if (traces.current) traces.current.style.transform = `translate3d(${(-px * 12).toFixed(1)}px, ${(-py * 7).toFixed(1)}px, 0)`;
        });
    };
    el.addEventListener("pointermove", onMove, { passive: true });

    const q = sim.current;
    return () => {
      mq.removeEventListener("change", onChange);
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(q.raf);
    };
  }, []);

  // ---- drag / swipe on the tower
  const down = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const q = sim.current;
    const w = scene.current?.getBoundingClientRect().width ?? 600;
    q.drag = { x: e.clientX, s: q.s, w, moved: false, t: performance.now(), lx: e.clientX, v: 0 };
    cancelAnimationFrame(q.raf);
    q.raf = 0;
    q.v = 0;
    scene.current?.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const q = sim.current;
    const d = q.drag;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 4) return;
    d.moved = true;
    const now = performance.now();
    d.v = (e.clientX - d.lx) / Math.max(1, now - d.t); // px per ms
    d.lx = e.clientX;
    d.t = now;
    // dragging right moves the front surface right = lower stage; mild rubber-band past the ends
    let s = d.s - dx / (d.w * 0.52);
    if (s < 0) s = s * 0.25;
    if (s > LAST) s = LAST + (s - LAST) * 0.25;
    q.s = s;
    paint(s);
  };
  const up = (e: React.PointerEvent) => {
    const q = sim.current;
    const d = q.drag;
    q.drag = null;
    if (scene.current?.hasPointerCapture(e.pointerId)) scene.current.releasePointerCapture(e.pointerId);
    if (!d || !d.moved) return;
    const fling = -d.v * 0.9; // inertia: a flick carries to the next stage
    goTo(Math.round(clamp(q.s + fling, 0, LAST)));
  };
  const key = (e: React.KeyboardEvent) => {
    const cur = Math.round(sim.current.target);
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); goTo(cur + 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); goTo(cur - 1); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(LAST); }
  };

  const cur = STAGES[stage];

  return (
    <section ref={hero} className="hero" data-stage={stage}>
      <div className="hero-bg" aria-hidden="true">
        <svg ref={traces} className="traces" viewBox="0 0 1440 800" preserveAspectRatio="xMidYMid slice">
          <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M0 742 H300 L340 702 H760 L800 742 H1010" />
            <path d="M0 800 H220 L260 760 H520" opacity=".55" />
            <path d="M0 84 H150 L190 124 H360" opacity=".4" />
          </g>
          <g fill="currentColor"><circle cx="300" cy="742" r="5" /><circle cx="220" cy="800" r="4" opacity=".55" /><circle cx="150" cy="84" r="4" opacity=".4" /></g>
          <g fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="300" cy="742" r="11" /><circle cx="220" cy="800" r="10" opacity=".55" /></g>
        </svg>
        <span className="glow g0" />
        <span className="glow g1" />
        <span className="glow g2" />
        <span className="beam b1" />
        <span className="beam b2" />
      </div>

      <div className="container hero-grid">
        <div className="hh">
          <p className="eyebrow">Enginious · Driven by innovation</p>
          <h1>
            Engineering movement <span className="accent">into experiences.</span>
          </h1>
        </div>

        <div className="hc">
          <div className="stage-copy" aria-live="polite">
            {STAGES.map((s, i) => (
              <div key={s.key} className="sc" data-on={i === stage} aria-hidden={i !== stage}>
                <p className="sc-title">{s.title}</p>
                <p className="sc-body">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="stepper" role="group" aria-label="From idea to experience">
            {STAGES.map((s, i) => (
              <button key={s.key} type="button" className="step" aria-pressed={i === stage} onClick={() => goTo(i)}>
                <span className="n">{s.n}</span>
                <span className="l">{s.label}</span>
              </button>
            ))}
          </div>

          <div className="hero-cta">
            <Link href="/work" className="btn btn-primary">Explore our work →</Link>
            <Link href="/contact" className="btn">Start a project</Link>
          </div>
        </div>

        <div
          ref={scene}
          className="scene"
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
              <g fill="none" stroke="currentColor" strokeWidth="1.4">
                <circle cx="200" cy="200" r="196" opacity=".7" />
                <circle cx="200" cy="200" r="150" opacity=".35" />
                <circle cx="200" cy="200" r="104" opacity=".25" />
              </g>
              <g stroke="currentColor" strokeWidth="2">
                {Array.from({ length: 36 }).map((_, i) => (
                  <path key={i} d={`M200 ${i % 3 === 0 ? 2 : 8} V16`} transform={`rotate(${i * 10} 200 200)`} opacity={i % 3 === 0 ? 0.9 : 0.4} />
                ))}
              </g>
            </svg>
          </span>

          <div ref={wrap} className="tower-wrap" aria-hidden="true">
            <div className="tower">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} ref={(el) => { if (el) tiers.current[i] = el; }} className="tier" style={{ ["--i" as string]: i, transform: tierT(i, LAST, REST_TWIST) }}>
                  <div className="face f0" />
                  <div className="face f1" />
                  <div className="face f2" />
                </div>
              ))}
            </div>
          </div>

          <ul className="annots" aria-hidden="true">
            {STAGES.map((s, i) => (
              <li key={s.key} data-on={i === stage}>
                {s.tags.map((t, k) => (
                  <span key={t} className={`tag t${k}`}>{t}</span>
                ))}
              </li>
            ))}
          </ul>

          <p className="hint" aria-hidden="true"><span className="dragicon">⟷</span> Drag to turn the tower</p>
        </div>
      </div>
    </section>
  );
}
