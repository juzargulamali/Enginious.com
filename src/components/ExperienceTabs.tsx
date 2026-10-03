"use client";

import { useState } from "react";

const ITEMS = [
  {
    id: "dna-xs",
    name: "DNA XS",
    text: "A display featuring rotating visual elements for dynamic storytelling.",
    detail: "Rotation turns a vertical stack of content into a form that visitors walk around.",
  },
  {
    id: "arc-shift",
    name: "Arc Shift",
    text: "A display creating curved, motion-driven visual transitions.",
    detail: "Curved surfaces and movement carry content through the space instead of holding it flat.",
  },
];

/** The two delivered experiences, described as in the company profile. */
export function ExperienceTabs() {
  const [sel, setSel] = useState(0);
  const cur = ITEMS[sel];
  return (
    <div className="panel" style={{ padding: "1.25rem" }}>
      <div role="tablist" aria-label="Delivered experiences" style={{ display: "flex", gap: 8 }}>
        {ITEMS.map((it, i) => (
          <button
            key={it.id}
            type="button"
            role="tab"
            id={`tab-${it.id}`}
            aria-selected={sel === i}
            aria-controls={`panel-${it.id}`}
            tabIndex={sel === i ? 0 : -1}
            className="chip"
            onClick={() => setSel(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") setSel((sel + 1) % ITEMS.length);
              if (e.key === "ArrowLeft") setSel((sel + ITEMS.length - 1) % ITEMS.length);
            }}
          >
            {it.name}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${cur.id}`} aria-labelledby={`tab-${cur.id}`} style={{ marginTop: 16 }}>
        <h3>{cur.name}</h3>
        <p style={{ marginTop: 8 }}>{cur.text}</p>
        <p className="muted" style={{ marginTop: 8 }}>{cur.detail}</p>
      </div>
    </div>
  );
}
