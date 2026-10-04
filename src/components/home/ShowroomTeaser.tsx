"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AddToBrief } from "@/components/AddToBrief";
import { TechForm } from "@/components/TechForm";
import { TECH_CATEGORIES, TECHNOLOGIES } from "@/content/technologies";
import { isNarrow, reducedMotion, useScrollProgress } from "@/lib/scrollBus";

/**
 * Digital showroom: six distinct exhibits (each drawn from the profile's description of that technology) standing on a
 * lit floor with reflections. Hover or tap an exhibit to read what it is. Pointer depth is mouse only, one write per frame.
 */
const EXHIBITS = ["touch-and-throw", "holofan", "tri-helix", "robotic-arm", "ai-photobooth", "circular-dial"];
const POS = [
  { x: 9, z: 0.82 }, { x: 24, z: 0.94 }, { x: 41, z: 1.12 }, { x: 59, z: 1.12 }, { x: 76, z: 0.94 }, { x: 91, z: 0.82 },
];

export function ShowroomTeaser() {
  const [sel, setSel] = useState(2);
  const manual = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);
  const choose = (i: number) => { manual.current = true; setSel(i); };
  // Scrolling through the showroom brings each exhibit forward in turn (desktop). Hover, tap or keys take over.
  useScrollProgress(wrap, (t) => {
    if (t < 0.05 || t > 0.97) manual.current = false;
    if (manual.current || reducedMotion() || isNarrow()) return;
    const i = Math.min(EXHIBITS.length - 1, Math.max(0, Math.floor(((t - 0.22) / 0.5) * EXHIBITS.length)));
    setSel((cur) => (cur === i ? cur : i));
  });
  const stage = useRef<HTMLDivElement>(null);
  const far = useRef<HTMLDivElement>(null);
  const near = useRef<HTMLDivElement>(null);
  const t = TECHNOLOGIES.find((x) => x.slug === EXHIBITS[sel])!;
  const cat = TECH_CATEGORIES.find((c) => c.key === t.category)!;

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

  return (
    <div ref={wrap} className="sr" data-front>
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
                aria-selected={sel === i}
                className="sr-ex"
                data-on={sel === i}
                style={{ left: `${p.x}%`, ["--z" as string]: p.z }}
                onMouseEnter={() => setSel(i)}
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
        <p className="eyebrow">{cat.label}</p>
        <h3>{t.name}</h3>
        <p>{t.summary}</p>
        <div className="sr-actions">
          {t.detailed && <Link href={`/technologies/${t.slug}`} className="btn">Open details →</Link>}
          <AddToBrief slug={t.slug} name={t.name} />
          <Link href="/technologies" className="btn btn-primary">Enter the showroom →</Link>
        </div>
      </div>
    </div>
  );
}
