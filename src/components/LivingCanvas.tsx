"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * "Living Canvas": an ABSTRACT brand expression, not a product. A field of points morphs between four forms
 * that echo what Enginious builds, and responds to pointer / touch. Plain 2D canvas (no 3D library):
 * pauses offscreen and in background tabs, caps pixel ratio, and renders a single still frame when the
 * visitor prefers reduced motion.
 */

type ModeKey = "move" | "respond" | "surround" | "connect";

const MODES: { key: ModeKey; label: string; line: string; href: string; cta: string }[] = [
  {
    key: "move",
    label: "Move",
    line: "Stacked triangular forms that turn and re-align: the logic of kinetic displays.",
    href: "/technologies/tri-helix",
    cta: "See Tri-Helix",
  },
  {
    key: "respond",
    label: "Respond",
    line: "A surface that answers every touch. Move your pointer or finger across it.",
    href: "/technologies#cat-interactive",
    cta: "Explore interactive",
  },
  {
    key: "surround",
    label: "Surround",
    line: "A tunnel of light that closes around you: immersive rooms and environments.",
    href: "/technologies#cat-immersive",
    cta: "Explore immersive",
  },
  {
    key: "connect",
    label: "Connect",
    line: "One connected team: Dubai headquarters, Saudi Arabia and Poland serving Europe.",
    href: "/company/team",
    cta: "Meet the team",
  },
];

type V3 = [number, number, number];

// Approximate positions (lat, lon) used only to place abstract node markers on the sphere.
const NODES = [
  { name: "Dubai", lat: 25.2, lon: 55.3 },
  { name: "Saudi Arabia", lat: 24.7, lon: 46.7 },
  { name: "Poland", lat: 52.0, lon: 19.5 },
];

function targetFor(mode: ModeKey, i: number, n: number, t: number, px: number, pz: number): V3 {
  switch (mode) {
    case "move": {
      const L = 6;
      const per = n / L;
      const layer = Math.floor(i / per);
      const k = (i % per) / per;
      const e = Math.floor(k * 3);
      const f = k * 3 - e;
      const a0 = layer * 0.3 + t * 0.4;
      const R = 0.74;
      const a1 = a0 + (e * 2 * Math.PI) / 3;
      const a2 = a0 + ((e + 1) * 2 * Math.PI) / 3;
      const x = Math.cos(a1) * (1 - f) + Math.cos(a2) * f;
      const z = Math.sin(a1) * (1 - f) + Math.sin(a2) * f;
      return [x * R, -0.62 + layer * (1.24 / (L - 1)), z * R];
    }
    case "respond": {
      const g = Math.ceil(Math.sqrt(n));
      const gx = i % g;
      const gz = Math.floor(i / g);
      const x = (gx / (g - 1) - 0.5) * 1.75;
      const z = (gz / (g - 1) - 0.5) * 1.75;
      const d = Math.hypot(x - px, z - pz);
      const y = 0.2 * Math.sin(d * 7 - t * 2.4) * Math.exp(-d * 1.1) + 0.03 * Math.sin(x * 3 + t * 0.8);
      return [x, y, z];
    }
    case "surround": {
      const R = 26;
      const per = n / R;
      const ring = Math.floor(i / per);
      const a = (2 * Math.PI * (i % per)) / per + ring * 0.16 + t * 0.12;
      const depth = (((ring / R + t * 0.05) % 1) + 1) % 1;
      const rad = 1.0 - depth * 0.55;
      return [Math.cos(a) * rad, Math.sin(a) * rad * 0.72, depth * 3.2 - 1.6];
    }
    case "connect": {
      const y = 1 - ((i + 0.5) / n) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      return [Math.cos(th) * r * 0.9, y * 0.9, Math.sin(th) * r * 0.9];
    }
  }
}

const linked = (mode: ModeKey, i: number, n: number) => {
  if (mode === "move") return (i + 1) % (n / 6) !== 0;
  if (mode === "surround") return (i + 1) % (n / 26) !== 0;
  if (mode === "respond") return (i + 1) % Math.ceil(Math.sqrt(n)) !== 0;
  return false;
};

function latLon(lat: number, lon: number, r: number): V3 {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.sin(lo) * r, Math.sin(la) * r, Math.cos(la) * Math.cos(lo) * r];
}

export function LivingCanvas() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<ModeKey>("move");
  const modeRef = useRef<ModeKey>("move");
  const redraw = useRef<() => void>(() => {});

  const choose = useCallback((m: ModeKey) => {
    modeRef.current = m;
    setMode(m);
    redraw.current();
  }, []);

  useEffect(() => {
    const cv = canvas.current!;
    const box = wrap.current!;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const low = (navigator.hardwareConcurrency ?? 8) <= 4 || window.innerWidth < 700;
    const N = low ? 468 : 780; // divisible by 6 and 26 -> keep structure clean
    const n = Math.round(N / 78) * 78;

    const pos = new Float32Array(n * 3);
    let W = 0;
    let H = 0;
    let dpr = 1;
    const ptr = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    const cam = { yaw: 0, pitch: 0.2 };
    let t = 0;
    let last = performance.now();
    let raf = 0;
    let visible = true;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = box.clientWidth;
      H = box.clientHeight;
      cv.width = Math.max(1, Math.floor(W * dpr));
      cv.height = Math.max(1, Math.floor(H * dpr));
      draw();
    };

    const snap = () => {
      const m = modeRef.current;
      for (let i = 0; i < n; i++) {
        const v = targetFor(m, i, n, t, ptr.x * 1.1, ptr.y * 1.1);
        pos[i * 3] = v[0];
        pos[i * 3 + 1] = v[1];
        pos[i * 3 + 2] = v[2];
      }
    };

    const camTarget = () => {
      const m = modeRef.current;
      const baseYaw = m === "connect" ? Math.PI - 0.66 + Math.sin(t * 0.3) * 0.45 : 0;
      const basePitch = m === "respond" ? 0.95 : m === "connect" ? -0.5 : m === "move" ? 0.38 : 0.22;
      return { yaw: baseYaw + ptr.x * 0.55, pitch: basePitch + ptr.y * 0.3 };
    };

    const project = (x: number, y: number, z: number, cy: number, sy: number, cp: number, sp: number): V3 => {
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y2 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      const d = 3.4;
      const s = d / (d + z2);
      const size = Math.min(W, H) * 0.4;
      return [W / 2 + x1 * s * size, H / 2 - y2 * s * size, z2];
    };

    function draw() {
      if (!W || !H) return;
      const m = modeRef.current;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, W, H);
      ctx!.globalCompositeOperation = "lighter";
      const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);

      const pts: V3[] = new Array(n);
      for (let i = 0; i < n; i++) pts[i] = project(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], cy, sy, cp, sp);

      // links
      ctx!.lineWidth = 1;
      ctx!.strokeStyle = "rgba(39,205,216,0.2)";
      ctx!.beginPath();
      for (let i = 0; i < n - 1; i++) {
        if (!linked(m, i, n)) continue;
        ctx!.moveTo(pts[i][0], pts[i][1]);
        ctx!.lineTo(pts[i + 1][0], pts[i + 1][1]);
      }
      if (m === "move") {
        // struts between matching corners of adjacent layers: reads as a twisting triangular tower
        const per = n / 6;
        for (let l = 0; l < 5; l++)
          for (let v = 0; v < 3; v++) {
            const a = pts[l * per + (v * per) / 3];
            const b = pts[(l + 1) * per + (v * per) / 3];
            ctx!.moveTo(a[0], a[1]);
            ctx!.lineTo(b[0], b[1]);
          }
      }
      ctx!.stroke();

      // soft halo behind near points
      ctx!.fillStyle = "rgba(39,205,216,0.07)";
      ctx!.beginPath();
      for (let i = 0; i < n; i += 2) {
        const p = pts[i];
        if (p[2] >= 0) continue;
        ctx!.moveTo(p[0] + 7, p[1]);
        ctx!.arc(p[0], p[1], 7, 0, 6.2832);
      }
      ctx!.fill();

      // points: far = deep teal, near = bright cyan
      const r0 = Math.max(1, Math.min(W, H) / 330);
      for (const [fill, near] of [["rgba(38,121,141,0.85)", false], ["rgba(61,210,220,0.95)", true]] as const) {
        ctx!.fillStyle = fill;
        ctx!.beginPath();
        for (let i = 0; i < n; i++) {
          const p = pts[i];
          if ((p[2] < 0) === near) continue;
          const sc = 3.4 / (3.4 + p[2]);
          ctx!.moveTo(p[0] + r0 * sc * 1.5, p[1]);
          ctx!.arc(p[0], p[1], r0 * sc * 1.5, 0, 6.2832);
        }
        ctx!.fill();
      }

      // Connect: abstract node markers + arcs between them
      if (m === "connect") {
        const ns = NODES.map((nd) => {
          const [x, y, z] = latLon(nd.lat, nd.lon, 0.92);
          return { ...nd, p: project(x, y, z, cy, sy, cp, sp), v: [x, y, z] as V3 };
        });
        ctx!.strokeStyle = "rgba(61,210,220,0.75)";
        ctx!.lineWidth = 1.4;
        for (const [a, b] of [[0, 1], [0, 2], [1, 2]] as const) {
          ctx!.beginPath();
          for (let s = 0; s <= 24; s++) {
            const f = s / 24;
            const v: V3 = [
              ns[a].v[0] * (1 - f) + ns[b].v[0] * f,
              ns[a].v[1] * (1 - f) + ns[b].v[1] * f,
              ns[a].v[2] * (1 - f) + ns[b].v[2] * f,
            ];
            const len = Math.hypot(...v) || 1;
            const lift = 0.92 + Math.sin(f * Math.PI) * 0.22;
            const q = project((v[0] / len) * lift, (v[1] / len) * lift, (v[2] / len) * lift, cy, sy, cp, sp);
            if (s === 0) ctx!.moveTo(q[0], q[1]);
            else ctx!.lineTo(q[0], q[1]);
          }
          ctx!.stroke();
        }
        ctx!.globalCompositeOperation = "source-over";
        ctx!.font = `500 ${Math.max(10, Math.min(W, H) / 38)}px ui-monospace, monospace`;
        for (const nd of ns) {
          const front = nd.p[2] < 0.4;
          ctx!.globalAlpha = front ? 1 : 0.25;
          ctx!.fillStyle = "#27cdd8";
          ctx!.beginPath();
          ctx!.arc(nd.p[0], nd.p[1], 5, 0, 6.2832);
          ctx!.fill();
          ctx!.strokeStyle = "rgba(39,205,216,0.5)";
          ctx!.beginPath();
          ctx!.arc(nd.p[0], nd.p[1], 10 + Math.sin(t * 2.5) * 2, 0, 6.2832);
          ctx!.stroke();
          ctx!.fillStyle = "#e8f3f5";
          const left = nd.name === "Saudi Arabia";
          ctx!.textAlign = left ? "right" : "left";
          ctx!.fillText(nd.name, nd.p[0] + (left ? -14 : 14), nd.p[1] + (nd.name === "Dubai" ? 18 : left ? -8 : 4));
        }
        ctx!.globalAlpha = 1;
        ctx!.textAlign = "left";
      }
      ctx!.globalCompositeOperation = "source-over";
    }

    const step = (now: number) => {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      // pointer easing; gentle idle drift when nobody is interacting
      if (!ptr.active) {
        ptr.tx = Math.sin(t * 0.25) * 0.25;
        ptr.ty = Math.cos(t * 0.2) * 0.12;
      }
      ptr.x += (ptr.tx - ptr.x) * 0.06;
      ptr.y += (ptr.ty - ptr.y) * 0.06;
      const ct = camTarget();
      cam.yaw += (ct.yaw - cam.yaw) * 0.05;
      cam.pitch += (ct.pitch - cam.pitch) * 0.05;
      const m = modeRef.current;
      for (let i = 0; i < n; i++) {
        const v = targetFor(m, i, n, t, ptr.x * 1.1, ptr.y * 1.1);
        const k = 0.045 + (i % 7) * 0.006;
        pos[i * 3] += (v[0] - pos[i * 3]) * k;
        pos[i * 3 + 1] += (v[1] - pos[i * 3 + 1]) * k;
        pos[i * 3 + 2] += (v[2] - pos[i * 3 + 2]) * k;
      }
      draw();
      raf = requestAnimationFrame(step);
    };

    const start = () => {
      if (reduce.matches || raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(step);
    };

    // Reduced motion (or mode change while still): snap straight to the new form and paint once.
    redraw.current = () => {
      if (reduce.matches) {
        const ct = camTarget();
        cam.yaw = ct.yaw;
        cam.pitch = ct.pitch;
        snap();
        draw();
      }
    };

    const onMove = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      ptr.active = true;
    };
    const onLeave = () => {
      ptr.active = false;
    };

    const io = new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) start();
    });
    io.observe(box);
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    const onVis = () => (document.hidden ? undefined : start());
    document.addEventListener("visibilitychange", onVis);
    box.addEventListener("pointermove", onMove);
    box.addEventListener("pointerleave", onLeave);
    box.addEventListener("pointercancel", onLeave);
    const onRM = () => {
      if (reduce.matches) {
        cancelAnimationFrame(raf);
        raf = 0;
        redraw.current();
      } else start();
    };
    reduce.addEventListener("change", onRM);

    snap();
    resize();
    if (reduce.matches) redraw.current();
    else start();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerleave", onLeave);
      box.removeEventListener("pointercancel", onLeave);
      reduce.removeEventListener("change", onRM);
    };
  }, []);

  const current = MODES.find((m) => m.key === mode)!;

  return (
    <div>
      <div ref={wrap} className="canvas-wrap" style={{ aspectRatio: "1 / 1", maxHeight: 620, width: "100%" }}>
        <canvas ref={canvas} aria-hidden="true" />
      </div>
      <div role="group" aria-label="Change the Living Canvas" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {MODES.map((m) => (
          <button key={m.key} type="button" className="chip" aria-pressed={mode === m.key} onClick={() => choose(m.key)}>
            {m.label}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="muted" style={{ marginTop: 14, minHeight: "3.2em", fontSize: "0.95rem" }}>
        {current.line}{" "}
        <Link href={current.href} className="accent" style={{ whiteSpace: "nowrap" }}>
          {current.cta} →
        </Link>
      </p>
      <p className="eyebrow" style={{ marginTop: 6, opacity: 0.7 }}>
        Abstract brand expression · not a product
      </p>
    </div>
  );
}
