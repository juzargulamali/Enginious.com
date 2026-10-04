"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Edge } from "@/components/neon/Edge";
import { useContent } from "@/components/ContentProvider";
import { Photo } from "@/components/Photo";
import { TechForm } from "@/components/TechForm";
import { isNarrow, reducedMotion, useScrollProgress } from "@/lib/scrollBus";

export type Capability = { n: string; title: string; blurb: string; tags: string[]; form: string; href: string; slot?: string };

/**
 * CAPABILITIES: three monoliths standing on a lit floor at different depths.
 * The active capability steps forward to the centre; its neighbours recede behind it (further back, smaller, dimmer, partly overlapped).
 * Scrolling through the scene moves the focus Events -> Centres -> Permanent; hovering, focusing or choosing a tab takes over and stays
 * until the scene leaves. Every monolith is a normal link, and the text inside never moves: only the whole monolith changes place, once,
 * on a compositor transition (transform and opacity). No loop, no pointer-driven motion. Phones get a static staggered stack.
 */
export function CapabilityStage({ items }: { items: Capability[] }) {
  const { imageForSlot } = useContent();
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const manual = useRef(false);
  const last = items.length - 1;

  const pick = useCallback((i: number, byUser = true) => {
    if (byUser) manual.current = true;
    setActive((a) => (a === i ? a : i));
  }, []);

  // Scroll moves the focus through the story; the visitor can always take over.
  useScrollProgress(root, (t) => {
    if (t < 0.12 || t > 0.9) manual.current = false;
    if (manual.current || reducedMotion() || isNarrow()) return;
    const next = t < 0.4 ? 0 : t < 0.58 ? 1 : 2;
    pick(Math.min(next, last), false);
  });

  // Reduced motion and phones: a calm, fixed composition (centre capability forward on desktop-with-reduced-motion).
  useEffect(() => { if (reducedMotion()) { const id = window.setTimeout(() => setActive(Math.min(1, last)), 0); return () => window.clearTimeout(id); } }, [last]);

  return (
    <div ref={root} className="cs" data-active={active} data-trace-scope>
      <span className="cs-floor" aria-hidden="true" />
      <span className="cs-haze" aria-hidden="true" />
      <div className="cs-row">
        {items.map((c, i) => {
          const o = i - active;
          const on = i === active;
          return (
            <Link
              key={c.n}
              href={c.href}
              className="mono"
              data-on={on || undefined}
              style={{ ["--o" as string]: o, ["--a" as string]: Math.abs(o) }}
              onFocus={() => pick(i)}
              onMouseEnter={() => pick(i)}
            >
              <span className="mono-body">
                {c.slot && imageForSlot(c.slot) && <span className="mono-photo"><Photo slot={c.slot} sizes="(max-width: 900px) 100vw, 33vw" /></span>}
                {on && <Edge variant="lit" duration={7} />}
                <span className="mono-n">{c.n}</span>
                <span className="mono-t">{c.title}</span>
                <span className="mono-more">
                  <span className="mono-b">{c.blurb}</span>
                  <span className="mono-tags">{c.tags.map((t) => <span key={t}>{t}</span>)}</span>
                </span>
                <span className="mono-go" aria-hidden="true">Explore →</span>
              </span>
              <span className="mono-art" aria-hidden="true"><TechForm slug={c.form} size={230} /></span>
              <span className="mono-pool" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
      <div className="cs-tabs" role="group" aria-label="Capabilities">
        {items.map((c, i) => (
          <button key={c.n} type="button" className="chip" aria-pressed={i === active} onClick={() => pick(i)}><b>{c.n}</b> {c.title.split(",")[0].split(" & ")[0]}</button>
        ))}
      </div>
    </div>
  );
}
