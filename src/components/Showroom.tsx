"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { TECH_CATEGORIES, type TechCategory, type Technology } from "@/content/technologies";
import { useContent } from "./ContentProvider";
import { useBrief } from "./BriefProvider";
import { AddToBrief } from "./AddToBrief";
import { PreviewProvider } from "./video/PreviewProvider";
import { CardMedia } from "./video/CardMedia";

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
  const { technologies: TECHNOLOGIES } = useContent();
  const [cat, setCat] = useState<TechCategory>("kinetic");
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

  const step = (d: number) => {
    const i = Math.max(0, inCat.findIndex((t) => t.slug === chosen?.slug));
    const next = chosen ? (i + d + inCat.length) % inCat.length : 0;
    setSelected(inCat[next].slug);
  };

  const meta = TECH_CATEGORIES.find((c) => c.key === cat)!;
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

        <div ref={stage} className="stage" style={{ ["--rx" as string]: "16deg", ["--ry" as string]: "0deg" }}>
          <div className="floor" aria-hidden="true" />
          <div className="exhibits">
            {inCat.map((t, i) => {
              const n = inCat.length;
              const x = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
              const z = (i % 2) * -90;
              return (
                <button
                  key={t.slug}
                  type="button"
                  className="exhibit"
                  data-on={chosen?.slug === t.slug}
                  aria-pressed={chosen?.slug === t.slug}
                  style={{ transform: `translate3d(0, 0, ${z}px)`, left: `${50 + x * 40}%` }}
                  onClick={() => setSelected(t.slug)}
                >
                  <span className="glyph"><Glyph category={t.category} seed={i} /></span>
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
                {chosen.detailed ? (
                  <Link href={`/technologies/${chosen.slug}`} className="btn">Open details →</Link>
                ) : (
                  null
                )}
                <AddToBrief slug={chosen.slug} name={chosen.name} />
              </div>
            </div>
          ) : (
            <p className="muted">Select an exhibit to see what it does, or start the guided tour.</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn" onClick={() => step(-1)} aria-label="Previous exhibit">←</button>
            <button type="button" className="btn" onClick={() => step(1)}>{chosen ? "Next exhibit →" : "Guided tour →"}</button>
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
              <p className="eyebrow">{TECH_CATEGORIES.find((c) => c.key === t.category)!.label}</p>
              <h3 style={{ marginTop: 6 }}>
                {t.detailed ? <Link href={`/technologies/${t.slug}`} className="accent">{t.name}</Link> : t.name}
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
