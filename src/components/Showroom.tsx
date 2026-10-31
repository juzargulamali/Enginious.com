"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStageSteer } from "@/lib/useStageSteer";
import { reducedMotion } from "@/lib/scrollBus";
import type { ImageAsset } from "@/content/images";
import type { TechCategory, Technology } from "@/content/technologies";
import { useContent } from "./ContentProvider";
import { useBrief } from "./BriefProvider";
import { AddToBrief } from "./AddToBrief";
import { PreviewProvider } from "./video/PreviewProvider";
import { CardMedia } from "./video/CardMedia";
import { Photo } from "./Photo";

const bigUrl = (a: ImageAsset) => `${a.src}-${a.widths[a.widths.length - 1]}.webp`;

/** Abstract exhibit glyphs: stylised category icons, NOT models of the real equipment. */
function Glyph({ category, seed }: { category: TechCategory; seed: number }) {
  const r = (seed % 3) * 8;
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true" {...common}>
      {category === "kinetic" &&
        [0, 1, 2, 3, 4].map((i) => (
          <polygon
            key={i}
            points={`${60 + Math.sin(i * 0.9 + seed) * 8},${20 + i * 17} ${100 + Math.sin(i * 0.9 + seed + 2) * 5},${44 + i * 17} ${20 + Math.sin(i * 0.9 + seed + 4) * 5},${44 + i * 17}`}
            opacity={0.4 + i * 0.15}
          />
        ))}
      {category === "interactive" && (
        <>
          <rect x="22" y="70" width="76" height="26" rx="4" />
          {[14, 26, 38].map((rad, i) => (
            <circle key={rad} cx="60" cy="48" r={rad + r / 2} opacity={0.9 - i * 0.25} />
          ))}
        </>
      )}
      {category === "immersive" && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={14 + i * 12} y={18 + i * 10} width={92 - i * 24} height={84 - i * 20} rx="6" opacity={1 - i * 0.2} />
          ))}
          <path d="M14 102 L46 72 M106 102 L74 72" opacity="0.5" />
        </>
      )}
      {category === "ai" && (
        <>
          {[[30, 36], [60, 22], [90, 40], [44, 80], [78, 84], [60, 56]].map(([x, y], i, a) =>
            a.slice(i + 1).map(([x2, y2], j) => <line key={`${i}-${j}`} x1={x} y1={y} x2={x2} y2={y2} opacity={0.3} />),
          )}
          {[[30, 36], [60, 22], [90, 40], [44, 80], [78, 84], [60, 56]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={5 + ((i + seed) % 3)} fill="currentColor" />
          ))}
        </>
      )}
      {category === "games" && (
        <>
          <rect x="18" y="44" width="84" height="44" rx="20" />
          <path d="M40 58 V74 M32 66 H48" />
          <circle cx="76" cy="62" r="4" fill="currentColor" />
          <circle cx="86" cy="72" r="4" />
        </>
      )}
      {!["kinetic", "interactive", "immersive", "ai", "robotics", "games"].includes(category) && (
        <>
          {[0, 1, 2].map((i) => <circle key={i} cx="60" cy="60" r={16 + i * 14 + r / 2} opacity={0.9 - i * 0.25} />)}
          <circle cx="60" cy="60" r="4" fill="currentColor" />
        </>
      )}
      {category === "robotics" && (
        <>
          <rect x="40" y="96" width="40" height="8" rx="2" />
          <polyline points={`60,96 60,70 ${84 + r},44 ${70 + r},20`} />
          <circle cx="60" cy="70" r="6" />
          <circle cx={84 + r} cy="44" r="6" />
          <circle cx={70 + r} cy="20" r="5" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

export function Showroom() {
  const brief = useBrief();
  const { technologies: TECHNOLOGIES, techCategories: TECH_CATEGORIES, imageById } = useContent();
  const [cat, setCat] = useState<TechCategory>(TECH_CATEGORIES[0].key);
  const [selected, setSelected] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<TechCategory | "all">("all");

  const inCat = useMemo(() => TECHNOLOGIES.filter((t) => t.category === cat), [TECHNOLOGIES, cat]);
  const sel: Technology | undefined = TECHNOLOGIES.find((t) => t.slug === selected);
  const chosen = sel && sel.category === cat ? sel : undefined;

  // Pointer parallax on the stage (skipped for reduced motion).
  useEffect(() => {
    const el = stage.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // One style write per animation frame (pointermove can fire 120+ times a second).
    let raf = 0;
    let ry = 0, rx = 16;
    const flush = () => {
      raf = 0;
      el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      ry = (((e.clientX - r.left) / r.width) * 2 - 1) * 7;
      rx = 16 - (((e.clientY - r.top) / r.height) * 2 - 1) * 3;
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const leave = () => {
      ry = 0;
      rx = 16;
      if (!raf) raf = requestAnimationFrame(flush);
    };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  // Empty category: nothing to step through (the arrows are disabled and a message is shown), never an index into an empty list.
  const centre = chosen ? inCat.findIndex((t) => t.slug === chosen.slug) : -1;
  const step = (d: number) => {
    const n = inCat.length;
    if (n === 0) return;
    const next = centre < 0 ? (d > 0 ? 0 : n - 1) : (centre + d + n) % n;
    setSelected(inCat[next]?.slug ?? null);
  };
  const select = (i: number) => { const t = inCat[i]; if (t) setSelected(t.slug); };

  // The same interactions as the homepage showroom: hover or edge steering with a mouse, swipe on touch, arrow keys, click.
  const swipe = useRef<{ x: number; done: boolean } | null>(null);
  useStageSteer(stage, {
    itemSelector: ".exhibit",
    indexOf: (el) => Number((el as HTMLElement).dataset.i ?? -1),
    current: () => centre,
    select,
    step: (d) => step(d),
  });
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault(); step(e.key === "ArrowRight" ? 1 : -1);
    window.requestAnimationFrame(() => stage.current?.querySelector<HTMLElement>('.exhibit[data-on="true"]')?.focus());
  };

  // The uploaded showroom animation plays only on the selected exhibit, only while the stage is on screen and motion is allowed.
  const playing = useRef<HTMLImageElement | null>(null);
  const onScreen = useRef(false);
  const chosenSlug = chosen?.slug;
  const stopAnim = () => {
    const img = playing.current; if (!img) return;
    playing.current = null; img.onload = null; img.onerror = null; img.removeAttribute("src");
    const fig = img.closest<HTMLElement>(".exh-fig"); img.remove(); if (fig) delete fig.dataset.anim;
  };
  const playAnim = () => {
    stopAnim();
    if (!chosenSlug || !onScreen.current || reducedMotion() || document.hidden) return;
    const ex = stage.current?.querySelector<HTMLElement>('.exhibit[data-on="true"]');
    const url = ex?.dataset.anim, fig = ex?.querySelector<HTMLElement>(".exh-fig"), slot = fig?.querySelector<HTMLElement>(".exh-anim-slot");
    if (!url || !fig || !slot || ex?.dataset.media === "failed") return;
    const img = new Image();
    img.className = "exh-anim"; img.alt = ""; img.decoding = "async"; img.draggable = false;
    img.onload = () => { if (playing.current === img) fig.dataset.anim = "ready"; };
    img.onerror = () => { if (playing.current === img) stopAnim(); };
    playing.current = img; slot.appendChild(img); img.src = url;
  };
  useEffect(() => {
    const el = stage.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { onScreen.current = e.isIntersecting; if (e.isIntersecting) playAnim(); else stopAnim(); }, { threshold: 0.25 });
    io.observe(el);
    const vis = () => { if (document.hidden) stopAnim(); else playAnim(); };
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); stopAnim(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { playAnim(); return stopAnim; }, [chosenSlug, cat]);

  const meta = TECH_CATEGORIES.find((c) => c.key === cat) ?? TECH_CATEGORIES[0];
  const list = TECHNOLOGIES.filter((t) => filter === "all" || t.category === filter);

  return (
    <>
      <div className="showroom panel">
        <div className="show-top">
          <div role="group" aria-label="Technology categories" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TECH_CATEGORIES.map((c) => (
              <button key={c.key} type="button" className="chip" aria-pressed={cat === c.key} onClick={() => { setCat(c.key); setSelected(null); }}>
                {c.label}
              </button>
            ))}
          </div>
          <a href="#browse" className="btn">View all technologies</a>
        </div>

        <p className="muted" style={{ padding: "0 1.25rem" }}>{meta.blurb}</p>

        <div
          ref={stage}
          className="stage"
          style={{ ["--rx" as string]: "16deg", ["--ry" as string]: "0deg" }}
          onPointerDown={(e) => { swipe.current = { x: e.clientX, done: false }; }}
          onPointerMove={(e) => { const w = swipe.current; if (w && !w.done && Math.abs(e.clientX - w.x) > 48) { w.done = true; step(e.clientX < w.x ? 1 : -1); } }}
          onPointerUp={() => { setTimeout(() => { swipe.current = null; }, 0); }}
          onPointerCancel={() => { swipe.current = null; }}
        >
          <div className="floor" aria-hidden="true" />
          {inCat.length === 0 && <p className="exh-empty muted" role="status">No technologies in this category yet.</p>}
          <div className="exhibits" onKeyDown={onKey}>
            {inCat.map((t, i) => {
              // A window of at most seven exhibits around the centre one, so a long category never overlaps; the arrows and clicks move the window.
              const n = inCat.length;
              const ci = chosen ? inCat.findIndex((x) => x.slug === chosen.slug) : n > 7 ? 3 : Math.floor((n - 1) / 2);
              // around the centre one, wrapping, so both sides are filled (the same cycle as the homepage showroom)
              let off = i - ci; if (n > 1) { const half = Math.floor(n / 2); off = ((((off + half) % n) + n) % n) - half; }
              const still = t.showcaseImage && imageById(t.showcaseImage) ? t.showcaseImage : undefined;
              const stillAsset = still ? imageById(still) : undefined;
              const anim = stillAsset && t.showcaseAnimation ? imageById(t.showcaseAnimation) : undefined;
              const fitS = Math.min(1.5, Math.max(0.5, (t.showcaseScale ?? 100) / 100)), fitY = Math.min(20, Math.max(-20, t.showcaseY ?? 0));
              return (
                <button
                  key={t.slug}
                  type="button"
                  className="exhibit"
                  data-on={chosen?.slug === t.slug}
                  data-far={Math.abs(off) > 3 || undefined}
                  data-far2={Math.abs(off) > 1 || undefined}
                  data-media={still ? "pending" : undefined}
                  data-anim={anim ? bigUrl(anim) : undefined}
                  data-i={i}
                  aria-pressed={chosen?.slug === t.slug}
                  style={{ transform: `translate3d(0, 0, ${-Math.min(Math.abs(off), 3) * 40}px)`, left: `calc(50% + ${off} * var(--sx, 15%))`, zIndex: 10 - Math.min(Math.abs(off), 9) }}
                  onClick={() => setSelected(t.slug)}
                >
                  <span className="glyph"><Glyph category={t.category} seed={i} />{still && <span className="exh-fig" style={{ ["--fit-s" as string]: fitS, ["--fit-y" as string]: `${-fitY}%` }}><Photo id={still} className="exh-img" label={false} sizes="160px" /><span className="exh-anim-slot" aria-hidden="true" /></span>}</span>
                  <span className="lbl">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="show-bottom">
          {chosen ? (
            <div className="detail" role="region" aria-label={`${chosen.name} details`}>
              <div style={{ minWidth: 0 }}>
                <p className="eyebrow">{meta.label}</p>
                <h3 style={{ marginTop: 4 }}>{chosen.name}</h3>
                <p className="muted" style={{ marginTop: 8 }}>{chosen.summary}</p>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Link href={`/technologies/${chosen.slug}`} className="btn">Open details →</Link>
                <AddToBrief slug={chosen.slug} name={chosen.name} />
              </div>
            </div>
          ) : (
            <p className="muted">{inCat.length === 0 ? "Choose another category, or browse all technologies below." : "Select an exhibit to see what it does, or start the guided tour."}</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn" onClick={() => step(-1)} aria-label="Previous exhibit" disabled={inCat.length === 0}>←</button>
            <button type="button" className="btn" onClick={() => step(1)} disabled={inCat.length === 0}>{chosen ? "Next exhibit →" : "Guided tour →"}</button>
          </div>
        </div>
        <p className="eyebrow" style={{ padding: "0 1.25rem 1.1rem", opacity: 0.65 }}>
          Concept showroom · exhibit shapes are abstract and will be matched to actual equipment
        </p>
      </div>

      <section id="browse" className="section" style={{ paddingBottom: 0 }}>
        <p className="eyebrow">Browse</p>
        <h2 style={{ marginTop: 10 }}>All technologies</h2>
        <div role="group" aria-label="Filter by category" style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "1.5rem 0" }}>
          <button type="button" className="chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button>
          {TECH_CATEGORIES.map((c) => (
            <button key={c.key} type="button" className="chip" aria-pressed={filter === c.key} onClick={() => setFilter(c.key)}>{c.label}</button>
          ))}
        </div>
        <PreviewProvider>
        <ul className="tech-grid">
          {list.map((t) => (
            <li key={t.slug} id={`cat-${t.category}-${t.slug}`} className="panel tech-item" data-vcard>
              <CardMedia id={`tech-${t.slug}`} title={t.name} video={t.video} posterImageId={t.media?.[0]} />
              <p className="eyebrow">{(TECH_CATEGORIES.find((c) => c.key === t.category) ?? TECH_CATEGORIES[0]).label}</p>
              <h3 style={{ marginTop: 6 }}>
                <Link href={`/technologies/${t.slug}`} className="accent">{t.name}</Link>
              </h3>
              <p className="muted" style={{ marginTop: 8, fontSize: "0.92rem" }}>{t.summary}</p>
              <div style={{ marginTop: "auto", paddingTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" className="chip" aria-pressed={brief.has(t.slug)} onClick={() => brief.toggle(t.slug)}>
                  {brief.has(t.slug) ? "✓ In brief" : "+ Brief"}
                </button>
              </div>
            </li>
          ))}
        </ul>
        </PreviewProvider>
      </section>
    </>
  );
}
