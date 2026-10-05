"use client";

import { useState } from "react";
import type { MediaOption } from "./fields/types";
import type { Data } from "@/lib/cms/schema";

/**
 * Live preview of how a technology looks on the homepage showroom podium, using the same framing as the public page:
 * one box and one transform for the resting image and the animation, so switching never jumps. Preview only: nothing is saved here.
 * The animation plays here only while "Play animation" is pressed (and never for visitors who reduce motion on the public page).
 */
export function ShowroomPreview({ data, media }: { data: Data; media: MediaOption[] }) {
  const [play, setPlay] = useState(false);
  const still = media.find((m) => m.id === data.showcase_image);
  const anim = media.find((m) => m.id === data.showcase_animation);
  const scale = Math.min(1.5, Math.max(0.5, (typeof data.showcase_scale === "number" ? data.showcase_scale : 100) / 100));
  const y = Math.min(20, Math.max(-20, typeof data.showcase_y === "number" ? data.showcase_y : 0));
  const style = { ["--fit-s" as string]: scale, ["--fit-y" as string]: `${-y}%` };
  return (
    <section className="adm-card" aria-label="Showroom preview">
      <h2>Showroom preview</h2>
      <div className="adm-sp" style={style}>
        <span className="adm-sp-light" aria-hidden="true" />
        <span className="adm-sp-fig">
          {still?.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="adm-sp-img" src={still.thumb} alt="" />
          ) : <span className="adm-sp-empty">No resting image yet. The line drawing is shown on the site.</span>}
          {play && anim?.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="adm-sp-img adm-sp-anim" src={anim.thumb} alt="" />
          )}
        </span>
        <span className="adm-sp-pod" aria-hidden="true" />
      </div>
      <p className="adm-help" style={{ marginTop: 8 }}>
        {!still ? "Choose a resting image to preview it." : anim ? "The resting image shows on neighbouring exhibits; the animation plays on the selected one." : "Add an animation to preview it here. The resting image alone is fine."}
      </p>
      {anim && still && <button type="button" className="adm-btn" onClick={() => setPlay((v) => !v)}>{play ? "Show resting image" : "Play animation"}</button>}
      {anim && !still && <p className="adm-alert adm-alert-warn">An animation needs a resting image too. It is ignored until one is chosen.</p>}
    </section>
  );
}
