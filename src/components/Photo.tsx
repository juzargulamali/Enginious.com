"use client";

import { useEffect, useRef } from "react";
import type { ImageAsset } from "@/content/images";
import { useContent } from "./ContentProvider";

/**
 * Renders a registered photo, or nothing (so the caller's designed fallback shows) when the slot is empty.
 * Focal point drives object-position, so any crop keeps the subject. Stock and concept imagery gets a discreet
 * "Illustrative image" label; preview portraits are labelled "Preview"; real photos carry no label.
 * Assets come from the CMS media library (or the built-in registry) through the site content context.
 *
 * AUTOMATIC ARTWORK HAND-OVER: a component that combines a photograph with decorative fallback artwork marks its root with
 * `data-media="pending"` whenever an image is assigned. This component then sets that attribute on the nearest such root to
 * `loaded` (the picture decoded) or `failed` (broken URL / no data). CSS hides the artwork while pending and loaded, so no
 * illustration ever shows over (or flashes before) the photo, and brings it back only on `failed`. No React state, no re-render.
 */
export function Photo({ slot, id, sizes = "100vw", priority = false, className = "", label = true, style }: { slot?: string; id?: string; sizes?: string; priority?: boolean; className?: string; label?: boolean; style?: React.CSSProperties }) {
  const { imageById, imageForSlot } = useContent();
  const img = useRef<HTMLImageElement>(null);
  const a: ImageAsset | undefined = id ? imageById(id) : slot ? imageForSlot(slot) : undefined;
  const key = a ? `${a.src}` : "";
  useEffect(() => {
    const el = img.current;
    const scope = el?.closest<HTMLElement>("[data-media]");
    if (!el || !scope) return;
    const done = (ok: boolean) => { scope.dataset.media = ok ? "loaded" : "failed"; };
    if (el.complete) done(el.naturalWidth > 0); // loaded or failed before hydration
    else { el.addEventListener("load", () => done(true), { once: true }); el.addEventListener("error", () => done(false), { once: true }); }
  }, [key]);
  if (!a) return null;
  const set = a.widths.map((w) => `${a.src}-${w}.webp ${w}w`).join(", ");
  const largest = a.widths[a.widths.length - 1];
  const tag = a.status === "stock" || a.status === "concept" ? "Illustrative image" : a.status === "preview-portrait" || a.status === "fictional-portrait" ? "Preview" : null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={img}
        className={`photo ${className}`}
        src={`${a.src}-${largest}.webp`}
        srcSet={set}
        sizes={sizes}
        width={a.width}
        height={a.height}
        alt={a.alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        style={{ objectPosition: `${a.focal[0] * 100}% ${a.focal[1] * 100}%`, ...style }}
      />
      {label && tag && <span className="photo-tag">{tag}</span>}
    </>
  );
}
