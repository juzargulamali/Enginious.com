"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AddToBrief } from "@/components/AddToBrief";
import { TechForm } from "@/components/TechForm";
import { TECH_CATEGORIES } from "@/content/technologies";
import { useContent } from "@/components/ContentProvider";
import { isNarrow, reducedMotion, useScrollProgress } from "@/lib/scrollBus";

/**
 * Digital showroom: six distinct exhibits on a lit floor. Hover, tap or keys select an exhibit; scrolling through the section
 * also brings each forward in turn (desktop). Pointer depth is mouse only, one write per frame.
 *
 * PERFORMANCE: all six explanations are rendered once and the active exhibit/explanation is switched by toggling attributes
 * directly on the DOM (no React render per change), and no inherited `color` is transitioned (that restyled every SVG
 * shape in every exhibit on each frame). Only opacity/transform change, which the compositor handles.
 */
const ALL_EXHIBITS = ["touch-and-throw", "holofan", "tri-helix", "robotic-arm", "ai-photobooth", "circular-dial"];
// Positions for the exhibits that are actually published (the CMS may hide some), spread evenly with the centre nearest.
const posFor = (n: number) => Array.from({ length: n }, (_, i) => { const t = n === 1 ? 0.5 : i / (n - 1); return { x: 9 + t * 82, z: 0.82 + 0.3 * (1 - Math.abs(t - 0.5) * 2) }; });

export function ShowroomTeaser() {
  const { technologies: TECHNOLOGIES } = useContent();
  const EXHIBITS = ALL_EXHIBITS.filter((s) => TECHNOLOGIES.some((t) => t.slug === s));
  const POS = posFor(EXHIBITS.length);
  const MID = Math.min(2, Math.max(0, EXHIBITS.length - 1));
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const far = useRef<HTMLDivElement>(null);
  const near = useRef<HTMLDivElement>(null);
  const manual = useRef(false);
  const current = useRef(MID);

  const activate = (i: number) => {
    if (i === current.current && root.current?.dataset.ready) return;
    current.current = i;
    const r = root.current;
    if (!r) return;
    r.dataset.ready = "1";
    r.querySelectorAll<HTMLElement>(".sr-ex").forEach((el, k) => { el.dataset.on = String(k === i); el.setAttribute("aria-selected", String(k === i)); });
    r.querySelectorAll<HTMLElement>(".sr-i").forEach((el, k) => { el.hidden = k !== i; });
  };
  const choose = (i: number) => { manual.current = true; activate(i); };

  // Scrolling through the showroom brings each exhibit forward in turn (desktop). Hover, tap or keys take over.
  useScrollProgress(root, (t) => {
    if (t < 0.05 || t > 0.97) manual.current = false;
    if (manual.current || reducedMotion() || isNarrow()) return;
    activate(Math.min(EXHIBITS.length - 1, Math.max(0, Math.floor(((t - 0.22) / 0.5) * EXHIBITS.length))));
  });

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let raf = 0, px = 0, py = 0;
    const flush = () => {
      raf = 0;
      if (far.current) far.current.style.transform = `translate3d(${(-px * 8).toFixed(1)}px, ${(-py * 4).toFixed(1)}px, 0)`;
      if (near.current) near.current.style.transform = `translate3d(${(px * 14).toFixed(1)}px, ${(py * 6).toFixed(1)}px, 0)`;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 2 - 1; py = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(flush);
    };
    el.addEventListener("pointermove", move, { passive: true });
    return () => { el.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, []);

  if (EXHIBITS.length === 0) return null;
  return (
    <div ref={root} className="sr" data-front>
      <div ref={stage} className="sr-stage" data-trace-scope>
        <div ref={far} className="sr-far" aria-hidden="true"><span className="cone c1" /><span className="cone c2" /><span className="cone c3" /><span className="cone c4" /><span className="cone c5" /><span className="cone c6" /></div>
        <span className="sr-floor" aria-hidden="true" />
        <div ref={near} className="sr-near" role="listbox" aria-label="Technologies">
          {EXHIBITS.map((slug, i) => {
            const tech = TECHNOLOGIES.find((x) => x.slug === slug)!;
            const p = POS[i];
            return (
              <button
                key={slug}
                type="button"
                role="option"
                aria-selected={i === MID}
                className="sr-ex"
                data-on={i === MID}
                style={{ left: `${p.x}%`, ["--z" as string]: p.z }}
                onMouseEnter={() => activate(i)}
                onFocus={() => choose(i)}
                onClick={() => choose(i)}
              >
                <span className="sr-art"><TechForm slug={slug} size={180} /></span>
                <span className="sr-lbl">{tech.name}</span>
                <span className="sr-refl" aria-hidden="true"><TechForm slug={slug} size={180} /></span>
              </button>
            );
          })}
        </div>
      </div>
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
