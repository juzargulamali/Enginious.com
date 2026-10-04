"use client";

import { useEffect, useRef } from "react";

/** Full showreel with sound, in an accessible modal. Nothing loads until it is opened. */
export function ShowreelDialog({ open, onClose, youtubeId, file, title = "Enginious showreel" }: { open: boolean; onClose: () => void; youtubeId: string; file?: string; title?: string }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="reel-dialog" aria-label={title} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="reel-frame">
        <button type="button" className="reel-close" onClick={onClose} aria-label="Close showreel">✕</button>
        {open &&
          (file ? (
            <video src={file} controls autoPlay playsInline />
          ) : (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={title}
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
            />
          ))}
      </div>
    </dialog>
  );
}
