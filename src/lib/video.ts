// Video links for projects and technologies. Pure helpers (server, client and the CMS validator share them).
// Supported: YouTube (watch, youtu.be, embed, shorts, live; public or unlisted) and direct https video files (.mp4, .webm, .m4v, .mov, .ogv).
// NOT supported: SharePoint / OneDrive / Google Drive / Dropbox share pages (they are sign-in or preview pages, not video files).

export type ParsedVideo = { kind: "youtube"; id: string } | { kind: "file"; url: string; type: string };

const FILE_TYPES: Record<string, string> = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/mp4", webm: "video/webm", ogv: "video/ogg" };
const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseVideoUrl(raw: string | undefined | null): ParsedVideo | null {
  if (!raw) return null;
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  if (host === "youtu.be") { const id = u.pathname.slice(1).split("/")[0]; return YT_ID.test(id) ? { kind: "youtube", id } : null; }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v = u.searchParams.get("v");
    if (u.pathname === "/watch" && v && YT_ID.test(v)) return { kind: "youtube", id: v };
    const m = /^\/(embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/.exec(u.pathname);
    if (m) return { kind: "youtube", id: m[2] };
    return null;
  }
  const ext = /\.([a-z0-9]{3,4})$/i.exec(u.pathname)?.[1]?.toLowerCase();
  if (ext && FILE_TYPES[ext]) return { kind: "file", url: u.toString(), type: FILE_TYPES[ext] };
  return null;
}

/** What the CMS stores for one video, normalised. */
export interface VideoSpec {
  /** Main video (full playback). */
  url: string;
  /** Card preview segment: where it starts and how long it plays before repeating. It never limits full playback. */
  start: number;
  seconds: number;
  /** Media id of a poster image; falls back to the card image, then to the YouTube thumbnail. */
  poster?: string;
  /** Advanced override: a direct video file used only for the card preview. */
  previewUrl?: string;
}

export const VIDEO_DEFAULTS = { start: 0, seconds: 10 } as const;

export function toVideoSpec(d: { video_url?: unknown; video_preview_start?: unknown; video_preview_seconds?: unknown; video_poster?: unknown; video_preview_url?: unknown }): VideoSpec | undefined {
  const url = typeof d.video_url === "string" ? d.video_url.trim() : "";
  if (!url || !parseVideoUrl(url)) return undefined;
  const n = (v: unknown, def: number, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
  const prev = typeof d.video_preview_url === "string" && parseVideoUrl(d.video_preview_url)?.kind === "file" ? d.video_preview_url.trim() : undefined;
  return { url, start: n(d.video_preview_start, VIDEO_DEFAULTS.start, 0, 36000), seconds: n(d.video_preview_seconds, VIDEO_DEFAULTS.seconds, 3, 60), poster: typeof d.video_poster === "string" && d.video_poster ? d.video_poster : undefined, previewUrl: prev };
}

export const youtubeThumb = (id: string, quality: "maxresdefault" | "hqdefault" = "hqdefault") => `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
