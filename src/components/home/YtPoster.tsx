"use client";

import { useMemo, useState } from "react";

/**
 * A poster image that degrades gracefully instead of leaving a broken or grey picture:
 * maxresdefault -> hqdefault -> nothing (the caller paints its own designed stage underneath).
 * YouTube answers a missing maxresdefault with a tiny grey placeholder rather than an error, so a very small image counts as a failure.
 */
export function YtPoster({ src, className, eager }: { src: string; className?: string; eager?: boolean }) {
  const candidates = useMemo(() => {
    const m = /^(https:\/\/i\.ytimg\.com\/vi\/[^/]+)\/maxresdefault\.jpg$/.exec(src);
    return m ? [src, `${m[1]}/hqdefault.jpg`] : [src];
  }, [src]);
  const [i, setI] = useState(0);
  if (i >= candidates.length) return null;
  const last = i === candidates.length - 1;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src={candidates[i]}
      alt=""
      decoding="async"
      {...(eager ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
      onError={() => setI((n) => n + 1)}
      onLoad={(e) => { if (!last && e.currentTarget.naturalWidth <= 160) setI((n) => n + 1); }}
    />
  );
}
