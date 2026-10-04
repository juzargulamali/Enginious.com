"use client";

import { useState } from "react";

/** Click-to-load, privacy-enhanced YouTube embed: nothing is requested from YouTube until the visitor asks for the video. */
export function YouTubeEmbed({ id }: { id: string }) {
  const [on, setOn] = useState(false);
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return (
    <div className="yt-embed" style={{ position: "relative", aspectRatio: "16 / 9", borderRadius: 12, overflow: "hidden", border: "1px solid var(--line, rgba(255,255,255,.12))", background: "#02070b" }}>
      {on ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1`}
          title="Video"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      ) : (
        <button type="button" onClick={() => setOn(true)} className="btn" style={{ position: "absolute", inset: 0, margin: "auto", width: "fit-content", height: "fit-content" }}>
          Play video (loads YouTube)
        </button>
      )}
    </div>
  );
}
