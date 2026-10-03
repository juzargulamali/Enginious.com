"use client";

import { useState } from "react";

type Form = "apart" | "hexagon" | "wall";
const FORMS: { key: Form; label: string; note: string }[] = [
  { key: "apart", label: "Rotating triangles", note: "Triangular screens stack and rotate 360 degrees." },
  { key: "hexagon", label: "Hexagon", note: "Aligned, they form shapes such as a hexagon." },
  { key: "wall", label: "LED wall", note: "Joined together, they form an LED wall." },
];

const A = 64; // triangle side
const R = A / Math.sqrt(3);
const H = (A * Math.sqrt(3)) / 2;

function transformFor(form: Form, k: number): string {
  if (form === "hexagon") {
    const th = ((60 * k + 30) * Math.PI) / 180;
    const phi = (Math.atan2(-Math.cos(th), Math.sin(th)) * 180) / Math.PI;
    return `translate(${(R * Math.cos(th)).toFixed(2)}px, ${(R * Math.sin(th)).toFixed(2)}px) rotate(${phi.toFixed(1)}deg)`;
  }
  if (form === "wall") {
    const x = k * (A / 2) - (5 * A) / 4;
    const up = k % 2 === 0;
    return `translate(${x}px, ${up ? -H / 3 + H / 2 : -(2 * H) / 3 + H / 2}px) rotate(${up ? 0 : 180}deg)`;
  }
  const th = ((60 * k + 30) * Math.PI) / 180;
  const rr = R * 2.6;
  const phi = (Math.atan2(-Math.cos(th), Math.sin(th)) * 180) / Math.PI + (k % 2 ? 38 : -38);
  return `translate(${(rr * Math.cos(th)).toFixed(2)}px, ${(rr * Math.sin(th)).toFixed(2)}px) rotate(${phi.toFixed(1)}deg) scale(0.82)`;
}

/** Abstract illustration of the convertible concept described in the company profile. Not to scale, not a product render. */
export function TriHelixDemo() {
  const [form, setForm] = useState<Form>("apart");
  const cur = FORMS.find((f) => f.key === form)!;
  return (
    <div className="panel" style={{ padding: "1.25rem" }}>
      <svg viewBox="-170 -120 340 240" role="img" aria-label={`Abstract illustration: Tri-Helix triangles arranged as ${cur.label}`} style={{ width: "100%", maxHeight: 320, display: "block" }}>
        {[0, 1, 2, 3, 4, 5].map((k) => (
          <polygon
            key={k}
            points={`0,${-R} ${A / 2},${H - R} ${-A / 2},${H - R}`}
            fill="rgba(39,205,216,0.16)"
            stroke="#27cdd8"
            strokeWidth="1.6"
            strokeLinejoin="round"
            style={{ transform: transformFor(form, k), transition: "transform 0.9s cubic-bezier(.3,.7,.2,1)", transformBox: "view-box" } as React.CSSProperties}
          />
        ))}
      </svg>
      <div role="group" aria-label="Tri-Helix illustration form" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {FORMS.map((f) => (
          <button key={f.key} type="button" className="chip" aria-pressed={form === f.key} onClick={() => setForm(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="muted" style={{ marginTop: 12, fontSize: "0.92rem" }}>{cur.note}</p>
      <p className="eyebrow" style={{ marginTop: 6, opacity: 0.65 }}>Abstract illustration · not to scale · not a product render</p>
    </div>
  );
}
