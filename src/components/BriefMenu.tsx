"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { techBySlug } from "@/content/technologies";
import { useBrief } from "./BriefProvider";

/**
 * "Your project brief": a compact control with the shortlist count. Review or remove choices, then continue to Contact:
 * the list is stored in this browser and carried into the enquiry form, so nothing is lost on the way.
 */
export function BriefMenu() {
  const { items, remove, clear } = useBrief();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const onDown = (e: PointerEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, [open]);

  return (
    <div ref={root} className="bm">
      <button ref={btn} type="button" className="bm-btn" aria-expanded={open} aria-controls="bm-panel" onClick={() => setOpen((o) => !o)}>
        <span className="bm-ico" aria-hidden="true" />
        <span className="bm-lbl">Your project brief</span>
        <span className="bm-n" data-zero={items.length === 0 || undefined} aria-label={`${items.length} selected`}>{items.length}</span>
      </button>
      {open && (
        <div id="bm-panel" className="bm-panel" role="region" aria-label="Your project brief">
          {items.length === 0 ? (
            <p className="muted">Nothing selected yet. Add technologies from the showroom and they will be carried into your enquiry.</p>
          ) : (
            <ul>
              {items.map((s) => (
                <li key={s}>
                  <span>{techBySlug(s)?.name ?? s}</span>
                  <button type="button" onClick={() => remove(s)} aria-label={`Remove ${techBySlug(s)?.name ?? s}`}>✕</button>
                </li>
              ))}
            </ul>
          )}
          <div className="bm-actions">
            <Link href="/technologies" className="btn" onClick={() => setOpen(false)}>Add technologies</Link>
            <Link href="/contact#brief" className="btn btn-primary" onClick={() => setOpen(false)}>Continue to Contact →</Link>
          </div>
          {items.length > 0 && <button type="button" className="bm-clear" onClick={clear}>Clear brief</button>}
        </div>
      )}
    </div>
  );
}
