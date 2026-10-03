"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { TechForm } from "@/components/TechForm";

/**
 * People stage: large cards in perspective, neighbours receding, light on the floor ring.
 * No portraits are used (none supplied or approved); each card shows its discipline. When approved photography exists,
 * it replaces the form on the card with no other change. Drag / swipe / arrow keys / buttons.
 */
const CARDS = [
  { id: "software", title: "Software", line: "Interactive applications and the logic behind each experience.", form: "touch-and-throw" },
  { id: "creative", title: "Creative", line: "Stories, visuals and 2D / 3D content for every screen.", form: "immersive-room" },
  { id: "leadership", title: "Leadership", line: "Juzar Gulamali, Founder & CEO · Rafi Ullah, Co-founder & CTO.", form: "mark", leaders: ["JG", "RU"] },
  { id: "engineering", title: "Engineering", line: "Mechatronics, electronics and fabrication that make it move.", form: "robotic-arm" },
  { id: "delivery", title: "Delivery", line: "Project management, installation and on-site support.", form: "circular-dial" },
];

export function PeopleStage() {
  const [active, setActive] = useState(2);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);
  const go = (d: number) => setActive((a) => (a + d + CARDS.length) % CARDS.length);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
  };
  return (
    <div className="ps">
      <div
        className="ps-stage"
        role="group"
        aria-roledescription="carousel"
        aria-label="Teams. Use the arrow keys, or drag."
        onKeyDown={onKey}
        onPointerDown={(e) => { drag.current = { x: e.clientX, moved: false }; }}
        onPointerMove={(e) => { const d = drag.current; if (d && !d.moved && Math.abs(e.clientX - d.x) > 44) { d.moved = true; go(e.clientX < d.x ? 1 : -1); } }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <span className="ps-ring" aria-hidden="true" />
        {CARDS.map((c, i) => {
          const off = i - active;
          const abs = Math.abs(off);
          return (
            <button
              key={c.id}
              type="button"
              className="ps-card"
              data-active={off === 0}
              tabIndex={off === 0 ? 0 : -1}
              aria-label={`${c.title}${off === 0 ? " (selected)" : ""}`}
              aria-current={off === 0}
              onClick={() => { if (!drag.current?.moved) setActive(i); }}
              style={{ transform: `translateX(calc(${off} * var(--ps-step))) translateZ(${-abs * 170}px) rotateY(${off * -19}deg) scale(${off === 0 ? 1.1 : 1})`, zIndex: 10 - abs, opacity: abs > 2 ? 0 : 1 - abs * 0.2 }}
            >
              <span className="ps-face">
                <span className="ps-art"><TechForm slug={c.form} size={200} /></span>
                {c.leaders && <span className="ps-leaders">{c.leaders.map((l) => <i key={l}>{l}</i>)}</span>}
                <span className="ps-cap"><strong>{c.title}</strong></span>
              </span>
            </button>
          );
        })}
        <button type="button" className="btn ps-prev" onClick={() => go(-1)} aria-label="Previous team">←</button>
        <button type="button" className="btn ps-next" onClick={() => go(1)} aria-label="Next team">→</button>
      </div>
      <div className="ps-info" aria-live="polite">
        <h3>{CARDS[active].title}</h3>
        <p>{CARDS[active].line}</p>
        <Link href="/company/team" className="btn btn-primary">Meet the team →</Link>
      </div>
    </div>
  );
}
