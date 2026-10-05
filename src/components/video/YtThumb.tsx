"use client";

import { useMemo, useState } from "react";
import { youtubeThumb } from "@/lib/video";

/** A YouTube thumbnail that degrades gracefully: maxres, then hq, then nothing (YouTube answers a missing maxres with a tiny grey image). */
export function YtThumb({ id, className }: { id: string; className?: string }) {
  const list = useMemo(() => [youtubeThumb(id, "maxresdefault"), youtubeThumb(id, "hqdefault")], [id]);
  const [i, setI] = useState(0);
  if (i >= list.length) return null;
  const last = i === list.length - 1;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={list[i]} alt="" loading="lazy" decoding="async" onError={() => setI((n) => n + 1)} onLoad={(e) => { if (!last && e.currentTarget.naturalWidth <= 160) setI((n) => n + 1); }} />
  );
}
