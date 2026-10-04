"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { reducedMotion, useScrollProgress } from "@/lib/scrollBus";
import { useStageSteer } from "@/lib/useStageSteer";
import "./people.css";
import "./gallery.css";
import { Photo } from "@/components/Photo";
import { TechForm } from "@/components/TechForm";
import { useContent } from "@/components/ContentProvider";
import { DEPTS, DEPT_BLURB, type Dept } from "@/content/team";

const FORM: Record<Dept, string> = { leadership: "mark", engineering: "robotic-arm", creative: "immersive-room", software: "touch-and-throw", delivery: "circular-dial", business: "ai-assistant" };
const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
// Stock preview portraits stand in for two cards. They are shown by ROLE only (never with an employee's name) and labelled "Preview".
const PREVIEW: Record<string, string> = { "syed-tibyan": "previewMale", "zainab-jebur": "previewFemale" };

/**
 * ONE representation of the team, shared by the homepage and /company/team. A full-width gallery by default (selected card forward, neighbours receding in perspective; drag, swipe,
 * arrow keys, buttons, department filters, deliberate hover and gentle edge steering via useStageSteer); the same people as a simple list on
 * request. Clicking a side card centres it; clicking the centred card opens its profile. Never rotates by itself.
 */
export function TeamGallery({ showLink = false, depth = false }: { showLink?: boolean; depth?: boolean }) {
  const { people: PEOPLE, leaders: LEADERS, imageById, imageForSlot } = useContent();
  const isPreview = (id: string) => !!PREVIEW[id] && !!imageForSlot(PREVIEW[id]);
  const ORDER = useMemo(() => [...PEOPLE].sort((a, b) => (a.dept === "leadership" ? 0 : 1) - (b.dept === "leadership" ? 0 : 1)), [PEOPLE]);
  const wrap = useRef<HTMLDivElement>(null);
  const lift = useRef<HTMLDivElement>(null);
  // Restrained depth transition on arrival: the gallery rises and settles. Never rotates the people by itself.
  useScrollProgress(wrap, (t, r) => {
    if (!depth || !lift.current) return;
    const vh = window.innerHeight;
    const p = reducedMotion() ? 1 : Math.min(1, Math.max(0, (vh * 0.95 - r.top) / (vh * 0.55)));
    lift.current.style.transform = `translate3d(0, ${((1 - p) * 36).toFixed(1)}px, 0) scale(${(0.94 + 0.06 * p).toFixed(3)})`;
    lift.current.style.opacity = String(0.55 + 0.45 * p);
    void t;
  });
  const [dept, setDept] = useState<Dept | "all">("all");
  const [mode, setMode] = useState<"gallery" | "list">("gallery");
  const [active, setActive] = useState(0);
  const people = useMemo(() => ORDER.filter((p) => dept === "all" || p.dept === dept), [ORDER, dept]);
  const idx = Math.min(active, people.length - 1);
  const person = people[idx];
  const leader = person ? LEADERS[person.id] : undefined;
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const profile = useRef<HTMLDivElement>(null);
  const pressed = useRef<number | null>(null);
  const kbd = useRef(false);
  const go = (d: number) => setActive((a) => (Math.min(a, people.length - 1) + d + people.length) % people.length);
  const onKey = (e: React.KeyboardEvent) => {
    kbd.current = true;
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(people.length - 1); }
  };

  // keyboard selection keeps focus on the newly centred card (the focused element would otherwise become a side card)
  useEffect(() => {
    if (!kbd.current) return;
    kbd.current = false;
    stage.current?.querySelector<HTMLElement>('.tg-card[data-active="true"]')?.focus({ preventScroll: true });
  }, [idx, dept]);

  useStageSteer(stage, {
    itemSelector: ".tg-card",
    indexOf: (el) => Number((el as HTMLElement).dataset.i ?? -1),
    current: () => idx,
    select: (i) => setActive(i),
    step: (d) => go(d),
    ignore: ".tg-prev, .tg-next",
    paused: () => !!profile.current?.contains(document.activeElement),
  });

  const openProfile = () => {
    const el = profile.current;
    if (!el) return;
    el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "nearest" });
    el.focus({ preventScroll: true });
  };

  if (!person) return <p className="muted">The team will appear here soon.</p>;

  const face = (p: (typeof ORDER)[number]) => {
    const l = LEADERS[p.id];
    if (isPreview(p.id)) return <Photo slot={PREVIEW[p.id]} sizes="(max-width: 760px) 58vw, 340px" />;
    const asset = l?.photo ? imageById(l.photo) : undefined;
    return asset ? <Photo id={asset.id} sizes="(max-width: 760px) 58vw, 340px" /> : (
      <span className="tg-mono" aria-hidden="true"><TechForm slug={FORM[p.dept]} size={240} /><b>{initials(p.name)}</b></span>
    );
  };

  return (
    <div className="tg tg-wide" ref={wrap}>
      <div className="tg-top">
        <div role="group" aria-label="Filter people by department" className="tg-chips">
          {DEPTS.map((d) => <button key={d.key} type="button" className="chip" aria-pressed={dept === d.key} onClick={() => { setDept(d.key); setActive(0); }}>{d.label}</button>)}
        </div>
        <div role="group" aria-label="Team layout" className="tg-chips">
          <button type="button" className="chip" aria-pressed={mode === "gallery"} onClick={() => setMode("gallery")}>Gallery</button>
          <button type="button" className="chip" aria-pressed={mode === "list"} onClick={() => setMode("list")}>List</button>
        </div>
      </div>

      {mode === "list" ? (
        <ul className="tl">
          {people.map((p) => (
            <li key={p.id}>
              <span className="av">{LEADERS[p.id]?.photo ? <Photo id={LEADERS[p.id].photo!} sizes="56px" label={false} /> : initials(p.name)}</span>
              <span><b>{p.name}</b><span className="r">{p.role}</span></span>
            </li>
          ))}
        </ul>
      ) : (
        <div ref={lift} className={depth ? "tg-depth" : undefined}>
          <div
            ref={stage}
            className="tg-stage bleed"
            role="group"
            aria-roledescription="carousel"
            aria-label="Team portraits. Use the left and right arrow keys, or drag."
            onKeyDown={onKey}
            onPointerDown={(e) => { drag.current = { x: e.clientX, moved: false }; }}
            onPointerMove={(e) => { const d = drag.current; if (d && !d.moved && Math.abs(e.clientX - d.x) > 44) { d.moved = true; go(e.clientX < d.x ? 1 : -1); } }}
            onPointerUp={() => { setTimeout(() => { drag.current = null; }, 0); }}
            onPointerCancel={() => { drag.current = null; }}
          >
            <span className="tg-ring" aria-hidden="true" />
            {people.map((p, i) => {
              const n = people.length;
              let off = i - idx;
              if (off > n / 2) off -= n;
              else if (off < -n / 2) off += n; // ring: neighbours on both sides, so the selected card is always centred
              const abs = Math.abs(off);
              if (abs > 3) return null; // cards further out are not rendered at all, so they cannot widen the page
              return (
                <button
                  key={p.id}
                  type="button"
                  className="tg-card"
                  data-active={off === 0}
                  tabIndex={off === 0 ? 0 : -1}
                  data-i={i}
                  data-side={off === 0 ? "c" : off > 0 ? "r" : "l"}
                  aria-label={`${isPreview(p.id) ? `${p.role} (preview portrait)` : `${p.name}, ${p.role}`}${off === 0 ? " (selected)" : ""}`}
                  aria-current={off === 0}
                  onPointerDown={() => { pressed.current = idx; }}
                  onClick={() => { const was = pressed.current ?? idx; pressed.current = null; if (drag.current?.moved) return; if (was === i) openProfile(); else setActive(i); }}
                  style={{ transform: `translateX(calc(${off} * var(--step))) translateZ(${-abs * 190}px) rotateY(${off * -20}deg) scale(${off === 0 ? 1.1 : 1})`, zIndex: 10 - abs, ["--dim" as string]: off === 0 ? 0 : 0.14 + abs * 0.14 }}
                >
                  <span className="tg-face">
                    {face(p)}
                    <span className="tg-dim" aria-hidden="true" />
                    <span className="tg-cap"><strong>{isPreview(p.id) ? p.role : p.name}</strong>{!isPreview(p.id) && <span>{p.role}</span>}</span>
                  </span>
                </button>
              );
            })}
            <button type="button" className="btn tg-prev" onClick={() => go(-1)} aria-label="Previous person">←</button>
            <button type="button" className="btn tg-next" onClick={() => go(1)} aria-label="Next person">→</button>
          </div>
          <p className="stage-hint" aria-hidden="true">Move to explore · Click to discover</p>
          <div className="tg-dots" aria-hidden="true">{people.map((p, i) => <button key={p.id} type="button" tabIndex={-1} aria-current={i === idx} onClick={() => setActive(i)} />)}</div>
        </div>
      )}

      <div className="tg-profile" aria-live="polite" ref={profile} tabIndex={-1}>
        <div>
          <p className="eyebrow">{DEPTS.find((d) => d.key === person.dept)!.label}</p>
          <h3 style={{ marginTop: 6 }}>{isPreview(person.id) ? person.role : person.name}</h3>
          {!isPreview(person.id) && <p className="role">{person.role}</p>}
          <ul>{(leader?.responsibilities ?? [DEPT_BLURB[person.dept]]).map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
        {/* A leadership message is shown only once approved. Drafts live in docs/leadership-drafts.md and are never rendered. */}
        {leader?.approved && leader.message && (
          <div className="tg-msg">
            <p className="eyebrow">Leadership message</p>
            <p style={{ marginTop: 10 }}>{leader.message}</p>
          </div>
        )}
        {showLink && <div style={{ gridColumn: "1 / -1" }}><Link href="/company/team" className="btn btn-primary">Team &amp; leadership →</Link></div>}
      </div>
    </div>
  );
}
