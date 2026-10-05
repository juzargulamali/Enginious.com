"use client";

import { useState } from "react";
import { Photo } from "@/components/Photo";
import { useContent } from "@/components/ContentProvider";
import { parseVideoUrl, type VideoSpec } from "@/lib/video";
import { YtThumb } from "./YtThumb";
import "./video.css";

/**
 * The full video, visible in the page (no modal, no "Watch video" button to find): the poster and a Play control are ready. Pressing Play loads
 * the real player with its own controls and sound. The card-preview start and length settings never limit this player.
 * YouTube: the privacy-enhanced embed loads only on Play. A direct file uses the browser's own player (metadata only until played).
 */
export function VideoPlayer({ video, title, posterImageId }: { video: VideoSpec; title: string; posterImageId?: string }) {
  const { imageById } = useContent();
  const [on, setOn] = useState(false);
  const src = parseVideoUrl(video.url);
  if (!src) return null;
  const posterAsset = (video.poster && imageById(video.poster) ? video.poster : undefined) ?? (posterImageId && imageById(posterImageId) ? posterImageId : undefined);
  const poster = posterAsset ? <Photo id={posterAsset} className="vc-img" sizes="(max-width: 1000px) 100vw, 980px" /> : src.kind === "youtube" ? <YtThumb id={src.id} className="vc-img" /> : null;

  if (src.kind === "file") {
    return (
      <div className="vp">
        <video controls playsInline preload="metadata" aria-label={`Video: ${title}`} poster={undefined}>
          <source src={src.url} type={src.type} />
        </video>
      </div>
    );
  }
  return (
    <div className="vp">
      {on ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${src.id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`}
          title={`Video: ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <>
          <div className="vp-poster">{poster}</div>
          <button type="button" className="vp-play" onClick={() => setOn(true)} aria-label={`Play video: ${title}`}><span className="disc" aria-hidden="true">▶</span></button>
        </>
      )}
    </div>
  );
}
