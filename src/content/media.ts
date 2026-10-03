import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Showreel + film registry. The homepage hero plays the showreel as a muted, looping background.
 *
 *  1. FILE MODE (preferred, fastest): drop these in /public/video and redeploy. Detected automatically at build time.
 *       showreel.mp4          1920x1080, H.264, muted loop of the best 15-30 s, <= 12 MB
 *       showreel-mobile.mp4   (optional) 1280x720 or 9:16 crop, <= 5 MB
 *       showreel-poster.jpg   (optional) 1920x1080 still, first impression + reduced-motion fallback
 *  2. YOUTUBE MODE (current): the YouTube video id below, embedded privacy-enhanced (youtube-nocookie).
 *
 * Video files are never required: if neither exists the hero shows its designed stage + poster and a play button.
 */
export const YOUTUBE = {
  showreel: "OtAjMig32ZE",
  film: "YYEiNgZXd3w",
} as const;

export interface ShowreelConfig {
  mode: "file" | "youtube";
  youtubeId: string;
  mp4?: string;
  webm?: string;
  mobileMp4?: string;
  poster: string;
}

const has = (p: string) => existsSync(path.join(process.cwd(), "public", p));

export function resolveShowreel(): ShowreelConfig {
  const mp4 = has("video/showreel.mp4") ? "/video/showreel.mp4" : undefined;
  const webm = has("video/showreel.webm") ? "/video/showreel.webm" : undefined;
  const mobileMp4 = has("video/showreel-mobile.mp4") ? "/video/showreel-mobile.mp4" : undefined;
  const poster = has("video/showreel-poster.jpg") ? "/video/showreel-poster.jpg" : `https://i.ytimg.com/vi/${YOUTUBE.showreel}/maxresdefault.jpg`;
  return { mode: mp4 || webm ? "file" : "youtube", youtubeId: YOUTUBE.showreel, mp4, webm, mobileMp4, poster };
}

export const filmPoster = () => `https://i.ytimg.com/vi/${YOUTUBE.film}/maxresdefault.jpg`;
