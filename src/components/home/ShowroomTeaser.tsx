"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AddToBrief } from "@/components/AddToBrief";
import { TechForm } from "@/components/TechForm";
import { Photo } from "@/components/Photo";
import { TECH_CATEGORIES } from "@/content/technologies";
import { useContent } from "@/components/ContentProvider";
import { useStageSteer } from "@/lib/useStageSteer";
import { reducedMotion } from "@/lib/scrollBus";
import type { Technology } from "@/content/technologies";
import type { ImageAsset } from "@/content/images";
import "./gallery.css";

/**
 * Digital showroom as a full-width exhibition hall. The selected exhibit stands on the centre front podium and its information opens;
 * the others stay visible in a back row, further away (higher, smaller, dimmer) on either side. Selection: click or tap a side exhibit,
 * arrows, keys, swipe, a deliberate hover (about 300 ms, only after fresh pointer movement) or gentle steering by resting the cursor in
 * the left or right edge zone (see useStageSteer). Clicking the centred exhibit opens its details page. Scrolling the page never rotates it.
 *
 * SUPPLIED ASSETS (CMS, no code change): a technology may have a transparent resting image and, optionally, a transparent animated WebP. The resting image
 * replaces the line drawing once it loads (Photo flips data-media on the exhibit; the drawing returns if it fails). The animation is mounted ONLY while that
 * exhibit is the selected one, only while the stage is on screen and motion is allowed, and is unmounted (back to the resting image) as soon as it is not.
 * A plain <img> WebP loops from its first frame each time it is mounted; it cannot hold a last frame or reverse (see docs/design/showroom-assets).
 *
 * PERFORMANCE: all explanations render once; a change writes CSS variables on a handful of elements (no React render) and the move is a
 * compositor transition (transform and opacity). No pointer-driven per-frame motion, no filters, no inherited colour transitions.
 */
const ALL_EXHIBITS = ["touch-and-throw", "holofan", "tri-helix", "robotic-arm", "ai-photobooth", "circular-dial"];

type Pose = { x: number; y: number; s: number; o: number; z: number };
/** Where each exhibit stands when `active` is in front. Stage width w in px; phones keep only the nearest neighbours visible. */
function arrange(active: number, n: number, w: number): Pose[] {
  const narrow = w < 700;
  const right = Math.ceil((n - 1) / 2), left = n - 1 - right;
  return Array.from({ length: n }, (_, k) => {
    if (k === active) return { x: 0, y: 0, s: narrow ? 1.12 : 1.34, o: 1, z: 10 };
    // the others form a cycle around the active one: the next ones stand on the right, the previous ones on the left
    const d = (k - active + n) % n;
    const side = d <= right ? 1 : -1;
    const c = side > 0 ? right : left;
    const j = side > 0 ? d - 1 : n - 1 - d; // 0 = nearest the centre
    const base = narrow ? 0.3 : 0.23, span = narrow ? 0 : 0.25;
    const u = c <= 1 ? base + span / 2 : base + span * (j / (c - 1));
    const hide = narrow && j > 0;
    return { x: side * u * w, y: -(60 + j * 12), s: (narrow ? 0.6 : 0.66) - j * 0.05, o: hide ? 0 : 0.84 - j * 0.1, z: 6 - j };
  });
}
const vars = (p: Pose) => ({ ["--x" as string]: `${p.x.toFixed(1)}px`, ["--y" as string]: `${p.y}px`, ["--s" as string]: p.s, ["--o" as string]: p.o, zIndex: p.z });

const bigUrl = (a: ImageAsset) => `${a.src}-${a.widths[a.widths.length - 1]}.webp`;

/** The resting image, framed. Static and animated share this box and transform, so switching between them never changes size or position. */
function Fig({ tech, sizes }: { tech: Technology; sizes: string }) {
  const scale = Math.min(1.5, Math.max(0.5, (tech.showcaseScale ?? 100) / 100));
  const y = Math.min(20, Math.max(-20, tech.showcaseY ?? 0));
  return (
    <span className="sr-fig" style={{ ["--fit-s" as string]: scale, ["--fit-y" as string]: `${-y}%` }}>
      <Photo id={tech.showcaseImage} className="sr-cut" label={false} sizes={sizes} />
      <span className="sr-anim-slot" aria-hidden="true" />
    </span>
  );
}

export function ShowroomTeaser() {
  const { technologies: TECHNOLOGIES, imageById } = useContent();
  const router = useRouter();
  const EXHIBITS = ALL_EXHIBITS.filter((s) => TECHNOLOGIES.some((t) => t.slug === s));
  const N = EXHIBITS.length;
  const MID = Math.min(2, Math.max(0, N - 1));
  const POSES = arrange(MID, N, 1100); // server pose for a typical desktop; refined to the real stage width on mount
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const current = useRef(MID);
  const pressed = useRef<number | null>(null); // which exhibit was centred when the press began (focus moves selection before click fires)
  const swipe = useRef<{ x: number; done: boolean } | null>(null);
  const playing = useRef<HTMLImageElement | null>(null);
  const onScreen = useRef(false);

  // Animation of the selected exhibit only. Rapid changes just stop the previous one and start the next; stale loads are ignored.
  const stopAnim = () => {
    const img = playing.current;
    if (!img) return;
    playing.current = null;
    img.onload = null; img.onerror = null;
    img.removeAttribute("src"); // cancels a download still in flight
    const fig = img.closest<HTMLElement>(".sr-fig");
    img.remove();
    if (fig) delete fig.dataset.anim;
  };
  const playAnim = (i: number) => {
    stopAnim();
    if (!onScreen.current || reducedMotion() || document.hidden) return;
    const ex = stage.current?.querySelectorAll<HTMLElement>(".sr-ex")[i];
    const url = ex?.dataset.anim;
    const fig = ex?.querySelector<HTMLElement>(".sr-art .sr-fig");
    const slot = fig?.querySelector<HTMLElement>(".sr-anim-slot");
    if (!url || !fig || !slot || ex?.dataset.media === "failed") return;
    const img = new Image();
    img.className = "sr-anim"; img.alt = ""; img.decoding = "async"; img.draggable = false;
    img.onload = () => { if (playing.current === img) fig.dataset.anim = "ready"; };
    img.onerror = () => { if (playing.current === img) stopAnim(); }; // failed load: stay on the resting image
    playing.current = img;
    slot.appendChild(img);
    img.src = url;
  };

  const layout = (i: number) => {
    const st = stage.current;
    if (!st) return;
    const poses = arrange(i, N, st.clientWidth);
    st.querySelectorAll<HTMLElement>(".sr-ex").forEach((el, k) => {
      const p = poses[k];
      el.style.setProperty("--x", `${p.x.toFixed(1)}px`); el.style.setProperty("--y", `${p.y}px`); el.style.setProperty("--s", String(p.s)); el.style.setProperty("--o", String(p.o)); el.style.zIndex = String(p.z);
      el.tabIndex = k === i ? 0 : -1;
    });
  };
  const activate = (i: number) => {
    if (i === current.current && root.current?.dataset.ready) return;
    current.current = i;
    const r = root.current;
    if (!r) return;
    r.dataset.ready = "1";
    r.querySelectorAll<HTMLElement>(".sr-ex").forEach((el, k) => { el.dataset.on = String(k === i); el.setAttribute("aria-selected", String(k === i)); });
    r.querySelectorAll<HTMLElement>(".sr-i").forEach((el, k) => { el.hidden = k !== i; });
    const cnt = r.querySelector(".sr-count"); if (cnt) cnt.textContent = `${i + 1} / ${N}`;
    layout(i);
    playAnim(i);
  };
  const choose = (i: number) => activate(i);
  const step = (d: number) => choose((current.current + d + N) % N);

  // Keep the poses right for the real stage width.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(() => layout(current.current));
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N]);

  // Off-screen, hidden tab or reduced motion: back to the resting image. Back on screen: the selected exhibit plays again.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { onScreen.current = e.isIntersecting; if (e.isIntersecting) playAnim(current.current); else stopAnim(); }, { threshold: 0.25 });
    io.observe(el);
    const vis = () => { if (document.hidden) stopAnim(); else playAnim(current.current); };
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const rm = () => { if (mq.matches) stopAnim(); else playAnim(current.current); };
    document.addEventListener("visibilitychange", vis);
    mq.addEventListener("change", rm);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); mq.removeEventListener("change", rm); stopAnim(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [N]);

  useStageSteer(stage, {
    itemSelector: ".sr-ex",
    indexOf: (el) => Number((el as HTMLElement).dataset.i ?? -1),
    current: () => current.current,
    select: (i) => activate(i),
    step: (d) => step(d),
    ignore: ".sr-nav, .sr-nav *",
  });

  if (N === 0) return null;
  const open = (i: number) => {
    const t = TECHNOLOGIES.find((x) => x.slug === EXHIBITS[i]);
    if (t?.detailed) router.push(`/technologies/${t.slug}`);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); step(1); (stage.current?.querySelectorAll<HTMLElement>(".sr-ex")[current.current])?.focus(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); step(-1); (stage.current?.querySelectorAll<HTMLElement>(".sr-ex")[current.current])?.focus(); }
  };
  return (
    <div ref={root} className="sr" data-front>
      <div
        ref={stage}
        className="sr-stage bleed"
        data-trace-scope
        onPointerDown={(e) => { swipe.current = { x: e.clientX, done: false }; }}
        onPointerMove={(e) => { const w = swipe.current; if (w && !w.done && Math.abs(e.clientX - w.x) > 48) { w.done = true; step(e.clientX < w.x ? 1 : -1); } }}
        onPointerUp={() => { setTimeout(() => { swipe.current = null; }, 0); }}
        onPointerCancel={() => { swipe.current = null; }}
      >
        <span className="sr-wall" aria-hidden="true" />
        <span className="sr-floor" aria-hidden="true" />
        <span className="sr-halo" aria-hidden="true" />
        <span className="sr-spot" aria-hidden="true" />
        <div className="sr-near" role="listbox" aria-label="Technologies" onKeyDown={onKey}>
          {EXHIBITS.map((slug, i) => {
            const tech = TECHNOLOGIES.find((x) => x.slug === slug)!;
            const still = tech.showcaseImage ? imageById(tech.showcaseImage) : undefined;
            const anim = still && tech.showcaseAnimation ? imageById(tech.showcaseAnimation) : undefined;
            return (
              <button key={slug} type="button" role="option" aria-selected={i === MID} tabIndex={i === MID ? 0 : -1} className="sr-ex" data-on={i === MID} data-media={still ? "pending" : undefined} data-anim={anim ? bigUrl(anim) : undefined} style={vars(POSES[i])} data-i={i} onPointerDown={() => { pressed.current = current.current; }} onClick={() => {
                  const was = pressed.current ?? current.current; pressed.current = null;
                  if (swipe.current?.done) return;
                  if (was === i) open(i); else choose(i);
                }} onFocus={() => { if (current.current !== i) choose(i); }}>
                <span className="sr-art"><TechForm slug={slug} size={180} />{still && <Fig tech={tech} sizes="(max-width: 760px) 40vw, 320px" />}</span>
                <span className="sr-pod" aria-hidden="true" />
                <span className="sr-lbl">{tech.name}</span>
                <span className="sr-refl" aria-hidden="true"><TechForm slug={slug} size={180} />{still && <span className="sr-fig" style={{ ["--fit-s" as string]: Math.min(1.5, Math.max(0.5, (tech.showcaseScale ?? 100) / 100)), ["--fit-y" as string]: `${-Math.min(20, Math.max(-20, tech.showcaseY ?? 0))}%` }}><Photo id={tech.showcaseImage} className="sr-cut" label={false} sizes="160px" /></span>}</span>
              </button>
            );
          })}
        </div>
        <div className="sr-nav">
          <button type="button" className="chip" aria-label="Previous exhibit" onClick={() => step(-1)}>←</button>
          <span className="sr-count" aria-hidden="true">{MID + 1} / {N}</span>
          <button type="button" className="chip" aria-label="Next exhibit" onClick={() => step(1)}>→</button>
        </div>
      </div>
      <p className="stage-hint" aria-hidden="true">Move to explore · Click to discover</p>
      <div className="sr-info" aria-live="polite">
        {EXHIBITS.map((slug, i) => {
          const t = TECHNOLOGIES.find((x) => x.slug === slug)!;
          const cat = TECH_CATEGORIES.find((c) => c.key === t.category)!;
          return (
            <div key={slug} className="sr-i" hidden={i !== MID}>
              <p className="eyebrow">{cat.label}</p>
              <h3>{t.name}</h3>
              <p>{t.summary}</p>
              <div className="sr-actions">
                {t.detailed && <Link href={`/technologies/${t.slug}`} className="btn">Open details →</Link>}
                <AddToBrief slug={t.slug} name={t.name} />
                <Link href="/technologies" className="btn btn-primary">Enter the showroom →</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
