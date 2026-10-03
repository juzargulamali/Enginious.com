"use client";

import { useMemo, useRef, useState } from "react";
import { DEPTS, DEPT_BLURB, PEOPLE, type Dept } from "@/content/team";
import { ReviewNote } from "./ReviewNote";

const initials = (name: string) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export function PortraitPlaceholder({ name, big = false }: { name: string; big?: boolean }) {
  return (
    <div className="portrait" data-big={big} role="img" aria-label={`Portrait placeholder for ${name}`}>
      <span className="mono">{initials(name)}</span>
      <span className="pending">Portrait pending</span>
    </div>
  );
}

/** 3D portrait gallery: CSS perspective, drag/swipe, visible controls, keyboard, department filters. */
export function TeamGallery() {
  const [dept, setDept] = useState<Dept | "all">("all");
  const [active, setActive] = useState(0);
  const people = useMemo(() => PEOPLE.filter((p) => dept === "all" || p.dept === dept), [dept]);
  const idx = Math.min(active, people.length - 1);
  const person = people[idx];
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const go = (d: number) => setActive((a) => (Math.min(a, people.length - 1) + d + people.length) % people.length);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    if (e.key === "Home") { e.preventDefault(); setActive(0); }
    if (e.key === "End") { e.preventDefault(); setActive(people.length - 1); }
  };

  return (
    <div>
      <div role="group" aria-label="Filter people by department" style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {DEPTS.map((d) => (
          <button key={d.key} type="button" className="chip" aria-pressed={dept === d.key} onClick={() => { setDept(d.key); setActive(0); }}>
            {d.label}
          </button>
        ))}
      </div>

      <div
        className="gallery"
        role="group"
        aria-roledescription="carousel"
        aria-label="Team portraits. Use left and right arrow keys, or drag."
        onKeyDown={onKey}
        onPointerDown={(e) => { drag.current = { x: e.clientX, moved: false }; }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d && !d.moved && Math.abs(e.clientX - d.x) > 48) { d.moved = true; go(e.clientX < d.x ? 1 : -1); }
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onPointerLeave={() => { drag.current = null; }}
      >
        <div className="halo" aria-hidden="true" />
        {people.map((p, i) => {
          const off = i - idx;
          const abs = Math.abs(off);
          if (abs > 3) return null;
          return (
            <button
              key={p.id}
              type="button"
              className="pcard"
              data-active={off === 0}
              tabIndex={off === 0 ? 0 : -1}
              aria-label={`${p.name}, ${p.role}${off === 0 ? " (selected)" : ""}`}
              aria-current={off === 0}
              onClick={() => { if (!drag.current?.moved) setActive(i); }}
              onPointerMove={(e) => {
                if (off !== 0) return;
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty("--tx", `${(((e.clientY - r.top) / r.height) * 2 - 1) * -6}deg`);
                e.currentTarget.style.setProperty("--ty", `${(((e.clientX - r.left) / r.width) * 2 - 1) * 8}deg`);
              }}
              onPointerLeave={(e) => { e.currentTarget.style.setProperty("--tx", "0deg"); e.currentTarget.style.setProperty("--ty", "0deg"); }}
              style={{
                transform: `translateX(calc(${off} * var(--step))) translateZ(${-abs * 150}px) rotateY(${off * -17}deg) scale(${off === 0 ? 1.08 : 1})`,
                zIndex: 10 - abs,
                opacity: abs > 2 ? 0 : 1 - abs * 0.22,
              }}
            >
              <span className="card-in" style={{ transform: "rotateX(var(--tx,0deg)) rotateY(var(--ty,0deg))" }}>
                <PortraitPlaceholder name={p.name} />
                <span className="cap">
                  <strong>{p.name}</strong>
                  <span>{p.role}</span>
                </span>
              </span>
            </button>
          );
        })}
        <button type="button" className="btn gal-prev" onClick={() => go(-1)} aria-label="Previous person">←</button>
        <button type="button" className="btn gal-next" onClick={() => go(1)} aria-label="Next person">→</button>
      </div>
      <p className="muted" style={{ textAlign: "center", fontSize: "0.82rem" }} aria-hidden="true">Drag, swipe or use the arrows to meet the team</p>

      {person && (
        <div className="panel profile" aria-live="polite">
          <PortraitPlaceholder name={person.name} big />
          <div className="stack" style={{ ["--stack" as string]: "0.6rem" }}>
            <p className="eyebrow">{DEPTS.find((d) => d.key === person.dept)!.label}</p>
            <h3>{person.name}</h3>
            <p className="accent">{person.role}</p>
            <p className="muted">{DEPT_BLURB[person.dept]}</p>
            <ReviewNote>Personal introduction, portrait and optional relevant work to be supplied and approved by {person.name.split(" ")[0]}.</ReviewNote>
          </div>
        </div>
      )}
    </div>
  );
}

/** Straightforward list of everyone: works without the 3D gallery and is fully crawlable. */
export function TeamList() {
  return (
    <ul className="tech-grid" style={{ ["--min" as string]: "220px" }}>
      {PEOPLE.map((p) => (
        <li key={p.id} className="panel tech-item" style={{ padding: 14 }}>
          <strong style={{ fontFamily: "var(--font-display)" }}>{p.name}</strong>
          <span className="muted" style={{ fontSize: "0.9rem" }}>{p.role}</span>
        </li>
      ))}
    </ul>
  );
}
