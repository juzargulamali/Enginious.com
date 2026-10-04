"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Edge, type EdgeVariant } from "@/components/neon/Edge";
import { useContent } from "@/components/ContentProvider";
import { Photo } from "@/components/Photo";
import { TechForm } from "@/components/TechForm";
import { useReached } from "@/lib/scrollBus";

/**
 * A capability "portal". The travelling light on the spine reaches the card, then it lights up: its edge starts running,
 * its explanation opens and (when a photograph is registered for the slot) the photo fades in behind the form.
 * Pointer response (mouse only, one write per frame): the card leans toward the pointer and a light follows it.
 * Without JavaScript everything is visible (the dim state is only applied once the page is running).
 */
export function PortalCard({ title, blurb, tags, form, href, edge, n, slot }: { title: string; blurb: string; tags: string[]; form: string; href: string; edge: EdgeVariant; n: string; slot?: string }) {
  const { imageForSlot } = useContent();
  const card = useRef<HTMLAnchorElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const spot = useRef<HTMLSpanElement>(null);
  const reached = useReached(card, 0.72);

  useEffect(() => {
    const el = card.current;
    if (!el) return;
    let raf = 0, x = 0, y = 0, w = 1, h = 1;
    const flush = () => {
      raf = 0;
      if (inner.current) inner.current.style.transform = `perspective(900px) rotateY(${((x / w - 0.5) * 9).toFixed(2)}deg) rotateX(${((0.5 - y / h) * 7).toFixed(2)}deg)`;
      if (spot.current) spot.current.style.transform = `translate3d(${x - 160}px, ${y - 160}px, 0)`;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      x = e.clientX - r.left; y = e.clientY - r.top; w = r.width; h = r.height;
      if (!raf) raf = requestAnimationFrame(flush);
    };
    const leave = () => { if (inner.current) inner.current.style.transform = ""; };
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); };
  }, []);

  return (
    <Link ref={card} href={href} className="pc2" data-reached={reached || undefined} data-trace-scope>
      <span ref={inner} className="pc2-in">
        {slot && imageForSlot(slot) && <span className="pc2-photo"><Photo slot={slot} sizes="(max-width: 900px) 100vw, 33vw" /></span>}
        <span ref={spot} className="pc2-spot" aria-hidden="true" />
        {reached && <Edge variant={edge} duration={7} />}
        <span className="pc2-n">{n}</span>
        <span className="pc2-art"><TechForm slug={form} size={220} /></span>
        <span className="pc2-floor" aria-hidden="true" />
        <span className="pc2-t">{title}</span>
        <span className="pc2-more">
          <span className="pc2-b">{blurb}</span>
          <span className="pc2-tags">{tags.map((t) => <span key={t}>{t}</span>)}</span>
        </span>
        <span className="pc2-go" aria-hidden="true">Explore →</span>
      </span>
    </Link>
  );
}
