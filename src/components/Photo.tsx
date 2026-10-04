import { IMAGES, imageFor, type ImageAsset, type SlotName } from "@/content/images";

/**
 * Renders a registered photo, or nothing (so the caller's designed fallback shows) when the slot is empty.
 * Focal point drives object-position, so any crop keeps the subject. Stock imagery gets a discreet
 * "Illustrative image" label; preview portraits are labelled "Preview"; real photos carry no label.
 */
export function Photo({ slot, id, sizes = "100vw", priority = false, className = "", label = true, style }: { slot?: SlotName; id?: string; sizes?: string; priority?: boolean; className?: string; label?: boolean; style?: React.CSSProperties }) {
  const a: ImageAsset | undefined = id ? IMAGES[id] : slot ? imageFor(slot) : undefined;
  if (!a) return null;
  const set = a.widths.map((w) => `${a.src}-${w}.webp ${w}w`).join(", ");
  const largest = a.widths[a.widths.length - 1];
  const tag = a.status === "stock" || a.status === "concept" ? "Illustrative image" : a.status === "preview-portrait" || a.status === "fictional-portrait" ? "Preview" : null;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
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

export const hasPhoto = (slot: SlotName) => !!imageFor(slot);
