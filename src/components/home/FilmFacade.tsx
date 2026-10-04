"use client";

import { useState } from "react";
import { ShowreelDialog } from "./ShowreelDialog";
import { YtPoster } from "./YtPoster";
import { Photo } from "@/components/Photo";
import { useContent } from "@/components/ContentProvider";

/** Click-to-play film. No player code or video bytes load until the visitor asks (protects load speed, avoids tracking). */
export function FilmFacade({ youtubeId, poster, title }: { youtubeId: string; poster: string; title: string }) {
  const [open, setOpen] = useState(false);
  const { imageForSlot } = useContent();
  const focal = imageForSlot("projectsFocal"); // real project media (registered in the media library) takes the focal surface when it exists
  return (
    <>
      <button type="button" className="film" onClick={() => setOpen(true)} aria-label={`Play: ${title}`}>
        <span className="film-stage" aria-hidden="true"><span className="beam b1" /><span className="beam b2" /><span className="floor" /></span>
        {focal ? <span className="film-photo"><Photo slot="projectsFocal" sizes="(max-width: 1240px) 100vw, 1160px" /></span> : <YtPoster src={poster} />}
        <span className="film-ui"><span className="film-play" aria-hidden="true">▶</span><span>{title}</span></span>
      </button>
      <ShowreelDialog open={open} onClose={() => setOpen(false)} youtubeId={youtubeId} title={title} />
    </>
  );
}
