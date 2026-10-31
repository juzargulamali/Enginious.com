"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Poster for a Google Drive video when no poster image is set: Drive's own thumbnail of the file. It only works while the file is shared as
 * "Anyone with the link", and Google may answer with nothing or a tiny placeholder, in which case this renders nothing and the card falls back
 * to its normal placeholder. A poster picked in the CMS is always more reliable and takes priority.
 */
export function DriveThumb({ id, className }: { id: string; className?: string }) {
  const [bad, setBad] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // the image may already have failed (or loaded blank) before React attached the handlers
  useEffect(() => { const el = img.current; if (el?.complete && (el.naturalWidth <= 32)) setBad(true); }, []);
  if (bad) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={img} className={className} src={`https://drive.google.com/thumbnail?id=${id}&sz=w1280`} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
      onError={() => setBad(true)} onLoad={(e) => { if (e.currentTarget.naturalWidth <= 32) setBad(true); }} />
  );
}
