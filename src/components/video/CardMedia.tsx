"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Photo } from "@/components/Photo";
import { useContent } from "@/components/ContentProvider";
import { parseVideoUrl, type VideoSpec } from "@/lib/video";
import { loadYouTubeApi } from "@/lib/youtubeApi";
import { usePreview } from "./PreviewProvider";
import { YtThumb } from "./YtThumb";
import "./video.css";

/**
 * The picture area of a listing card (Work, Technologies). Shows the poster; on desktop hover or keyboard focus of the card, after a short
 * dwell, a MUTED preview of the configured segment plays and repeats while the card stays active. A separate, visible Preview button works
 * for touch, for keyboard and for visitors who reduce motion (who get no automatic preview).
 *
 * LIMITS, stated plainly: only one preview player exists in the whole listing (PreviewProvider); no player is created until a card is
 * activated; it is removed when the card is left, scrolled away, the tab hides or another card takes over. A YouTube segment loop is done with
 * the player's seek, so a short pause at each restart is normal. Limiting playback to a segment does not limit what the browser downloads.
 * Sound is never enabled here. Sources: YouTube via the official IFrame API (iframe at least 200 px high, never extracted), or a direct video file.
 */
type Props = { id: string; title: string; video?: VideoSpec; posterImageId?: string; fallback?: ReactNode };

const DWELL_MS = 250;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function CardMedia({ id, title, video, posterImageId, fallback }: Props) {
  const { imageById } = useContent();
  const { active, activate, deactivate } = usePreview();
  const root = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const isActive = active === id && !!video && !failed;

  const main = video ? parseVideoUrl(video.url) : null;
  const previewFile = video?.previewUrl ? parseVideoUrl(video.previewUrl) : null;
  const source = previewFile?.kind === "file" ? previewFile : main;
  const posterAsset = (video?.poster && imageById(video.poster) ? video.poster : undefined) ?? (posterImageId && imageById(posterImageId) ? posterImageId : undefined);

  // Automatic preview on desktop hover / keyboard focus of the whole card (never for reduced motion, never for touch).
  useEffect(() => {
    const card = root.current?.closest<HTMLElement>("[data-vcard]");
    if (!card || !video || !source || reduced()) return;
    let t = 0;
    const enter = (e: PointerEvent) => { if (e.pointerType !== "mouse") return; clearTimeout(t); t = window.setTimeout(() => { setFailed(false); activate(id); }, DWELL_MS); };
    const leave = (e: PointerEvent) => { if (e.pointerType !== "mouse") return; clearTimeout(t); deactivate(id); };
    const fin = () => { clearTimeout(t); t = window.setTimeout(() => { if (card.contains(document.activeElement)) { setFailed(false); activate(id); } }, 120); };
    const fout = () => { clearTimeout(t); window.setTimeout(() => { if (!card.contains(document.activeElement)) deactivate(id); }, 0); };
    card.addEventListener("pointerenter", enter); card.addEventListener("pointerleave", leave);
    card.addEventListener("focusin", fin); card.addEventListener("focusout", fout);
    return () => { clearTimeout(t); card.removeEventListener("pointerenter", enter); card.removeEventListener("pointerleave", leave); card.removeEventListener("focusin", fin); card.removeEventListener("focusout", fout); };
  }, [id, video, source, activate, deactivate]);

  // Off-screen cleanup while active.
  useEffect(() => {
    if (!isActive || !root.current) return;
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) deactivate(id); }, { threshold: 0.2 });
    io.observe(root.current);
    return () => io.disconnect();
  }, [isActive, id, deactivate]);

  const poster = posterAsset
    ? <Photo id={posterAsset} className="vc-img" sizes="(max-width: 700px) 100vw, 420px" />
    : main?.kind === "youtube" ? <YtThumb id={main.id} className="vc-img" /> : null;
  if (!video && !poster) return <>{fallback}</>;

  return (
    <div ref={root} className="vc" data-state={isActive ? (playing ? "playing" : "loading") : "idle"} data-video={video && source ? "1" : undefined}>
      <div className="vc-poster">{poster ?? fallback}</div>
      {isActive && source && (
        <div className="vc-layer" aria-hidden="true">
          {source.kind === "youtube"
            ? <YtPreview videoId={source.id} start={video!.start} seconds={video!.seconds} onPlaying={() => setPlaying(true)} onStop={() => setPlaying(false)} onFail={() => { setFailed(true); deactivate(id); }} />
            : <FilePreview url={source.url} type={source.type} start={previewFile ? 0 : video!.start} seconds={video!.seconds} onPlaying={() => setPlaying(true)} onStop={() => setPlaying(false)} onFail={() => { setFailed(true); deactivate(id); }} />}
        </div>
      )}
      {video && source && (
        <button
          type="button"
          className="vc-btn"
          aria-label={isActive ? `Stop preview of ${title}` : `Play preview of ${title}`}
          onClick={() => { if (isActive) deactivate(id); else { setFailed(false); activate(id); } }}
        >
          <span aria-hidden="true">{isActive ? "❚❚" : "▶"}</span><span className="vc-btn-t" aria-hidden="true">{isActive ? "Stop" : "Preview"}</span>
        </button>
      )}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function YtPreview({ videoId, start, seconds, onPlaying, onStop, onFail }: { videoId: string; start: number; seconds: number; onPlaying: () => void; onStop: () => void; onFail: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    let dead = false, player: any = null, poll = 0, guard = 0, started = false;
    loadYouTubeApi().then((YT) => {
      if (dead || !el) return;
      const mount = document.createElement("div"); el.appendChild(mount);
      player = new YT.Player(mount, {
        width: "100%", height: "100%", videoId, host: "https://www.youtube-nocookie.com",
        playerVars: { autoplay: 1, mute: 1, controls: 0, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, disablekb: 1, fs: 0, cc_load_policy: 0, start: Math.floor(start), origin: window.location.origin },
        events: {
          onReady: (e: any) => { if (dead) return; e.target.mute(); e.target.seekTo(start, true); e.target.playVideo(); },
          onStateChange: (e: any) => {
            if (dead) return;
            if (e.data === 1) { if (!started) { started = true; onPlaying(); } }
            if (e.data === 0) { try { e.target.seekTo(start, true); e.target.playVideo(); } catch { /* ignore */ } }
          },
          onError: () => { if (!dead) onFail(); },
        },
      });
      poll = window.setInterval(() => { try { if (player?.getPlayerState?.() === 1 && player.getCurrentTime() >= start + seconds - 0.2) player.seekTo(start, true); } catch { /* ignore */ } }, 200);
      guard = window.setTimeout(() => { if (!dead && !started) onFail(); }, 5000); // autoplay blocked or network stalled: back to the poster
    }).catch(() => { if (!dead) onFail(); });
    return () => { dead = true; clearInterval(poll); clearTimeout(guard); try { player?.destroy?.(); } catch { /* ignore */ } el?.replaceChildren(); onStop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, start, seconds]);
  return <div ref={host} className="vc-yt" />;
}

function FilePreview({ url, type, start, seconds, onPlaying, onStop, onFail }: { url: string; type: string; start: number; seconds: number; onPlaying: () => void; onStop: () => void; onFail: () => void }) {
  const v = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = v.current; if (!el) return;
    let dead = false; const guard = window.setTimeout(() => { if (!dead && el.paused) onFail(); }, 6000);
    const seek = () => { try { el.currentTime = start; } catch { /* ignore */ } };
    const tick = () => { if (el.currentTime >= start + seconds) seek(); };
    el.addEventListener("loadedmetadata", seek); el.addEventListener("timeupdate", tick);
    el.addEventListener("ended", () => { seek(); el.play().catch(() => {}); });
    el.addEventListener("playing", () => { clearTimeout(guard); onPlaying(); });
    el.addEventListener("error", () => { if (!dead) onFail(); }, true); // capture: a failing <source> reports on the source element, not on the video
    el.play().catch(() => { if (!dead) onFail(); }); // blocked autoplay: poster stays
    return () => { dead = true; clearTimeout(guard); el.pause(); el.removeAttribute("src"); el.load(); onStop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, start, seconds]);
  return <video ref={v} className="vc-file" muted playsInline preload="metadata" disablePictureInPicture disableRemotePlayback><source src={url} type={type} /></video>;
}
