"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Edge } from "@/components/neon/Edge";
import { ShowreelDialog } from "./ShowreelDialog";
import type { ShowreelConfig } from "@/content/media";

/**
 * Cinematic opening: the approved showreel, full bleed.
 *  - Poster and a designed stage are always painted first (fast LCP, and the hero is never empty).
 *  - The video fades in only when it is really playing. Nothing loads for reduced motion, Save-Data or 2G/3G;
 *    those visitors get the poster and a play button.
 *  - Muted loop, pauses offscreen, visible pause control (WCAG 2.2.2). Sound lives in the lightbox.
 *  - Restrained interactivity: pointer-driven light and three layers of depth (mouse only, one write per frame).
 */

type Net = { saveData?: boolean; effectiveType?: string };
const expensive = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  const c = (navigator as Navigator & { connection?: Net }).connection;
  return !!(c?.saveData || (c?.effectiveType && /(^|-)(2g|3g)$/.test(c.effectiveType)));
};

const yt = (id: string, origin: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0&enablejsapi=1&origin=${encodeURIComponent(origin)}`;

export function ShowreelHero({ cfg }: { cfg: ShowreelConfig }) {
  const hero = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const spot = useRef<HTMLSpanElement>(null);
  const layerV = useRef<HTMLDivElement>(null);
  const layerH = useRef<HTMLDivElement>(null);
  const layerT = useRef<HTMLDivElement>(null);
  const [auto, setAuto] = useState(false);
  const [src, setSrc] = useState<string | null>(null); // youtube iframe src (set after first paint)
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);
  const [posterOk, setPosterOk] = useState(true);
  const [open, setOpen] = useState(false);

  const command = useCallback((func: "playVideo" | "pauseVideo") => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "*");
  }, []);

  // ---- start (never block first paint; skip when motion is expensive)
  useEffect(() => {
    if (expensive()) return;
    const start = () => {
      setAuto(true);
      if (cfg.mode === "youtube") setSrc(yt(cfg.youtubeId, window.location.origin));
      else if (video.current) {
        video.current.src = cfg.mobileMp4 && window.innerWidth < 768 ? cfg.mobileMp4 : (cfg.mp4 ?? cfg.webm ?? "");
        video.current.play().catch(() => {});
      }
    };
    const t = window.setTimeout(start, 350);
    return () => window.clearTimeout(t);
  }, [cfg]);

  // ---- YouTube handshake: learn when it is really playing, and mirror its state
  useEffect(() => {
    if (!src) return;
    const onMsg = (e: MessageEvent) => {
      if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
      let data: { event?: string; info?: { playerState?: number } | number };
      try { data = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
      const st = typeof data.info === "number" ? data.info : data.info?.playerState;
      if (data.event === "onStateChange" || data.event === "infoDelivery") {
        if (st === 1) setPlaying(true);
        if (st === 2) setPaused(true);
        if (st === 1) setPaused(false);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [src]);
  const onFrameLoad = () => {
    let n = 0;
    const id = window.setInterval(() => {
      frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
      if (++n > 12) window.clearInterval(id);
    }, 500);
  };

  // ---- pause offscreen
  useEffect(() => {
    const el = hero.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      visibleRef.current = e.isIntersecting;
      if (pausedRef.current) return;
      if (cfg.mode === "file") {
        if (e.isIntersecting) video.current?.play().catch(() => {});
        else video.current?.pause();
      } else command(e.isIntersecting ? "playVideo" : "pauseVideo");
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [cfg.mode, command]);

  // ---- pointer light + depth: mouse only, one write per frame
  useEffect(() => {
    const el = hero.current;
    if (!el) return;
    let raf = 0, px = 0, py = 0, mx = 0, my = 0;
    const flush = () => {
      raf = 0;
      if (spot.current) spot.current.style.transform = `translate3d(${mx - 320}px, ${my - 320}px, 0)`;
      if (layerV.current) layerV.current.style.transform = `translate3d(${(-px * 10).toFixed(1)}px, ${(-py * 6).toFixed(1)}px, 0) scale(1.04)`;
      if (layerH.current) layerH.current.style.transform = `translate3d(${(px * 14).toFixed(1)}px, ${(py * 9).toFixed(1)}px, 0)`;
      if (layerT.current) layerT.current.style.transform = `translate3d(${(px * 5).toFixed(1)}px, ${(py * 3).toFixed(1)}px, 0)`;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
      px = (mx / r.width) * 2 - 1; py = (my / r.height) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(flush);
    };
    el.addEventListener("pointermove", move, { passive: true });
    return () => { el.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, []);

  const toggle = () => {
    const next = !paused;
    pausedRef.current = next;
    setPaused(next);
    if (cfg.mode === "file") {
      if (next) video.current?.pause();
      else video.current?.play().catch(() => {});
    } else command(next ? "pauseVideo" : "playVideo");
  };

  const poster = posterOk && cfg.poster;

  return (
    <section ref={hero} className="rh" aria-label="Enginious showreel">
      <div className="rh-media">
        <div className="rh-stage" aria-hidden="true">
          <span className="beam b1" /><span className="beam b2" /><span className="beam b3" /><span className="ringd" /><span className="pillar p1" /><span className="pillar p2" /><span className="pillar p3" /><span className="floor" />
        </div>
        <div ref={layerV} className="rh-layer">
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="rh-poster" src={cfg.poster} alt="" fetchPriority="high" decoding="async" onError={() => setPosterOk(false)} />
          )}
          {cfg.mode === "file" ? (
            <video ref={video} className="rh-video" data-on={playing || undefined} muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1} onPlaying={() => setPlaying(true)} />
          ) : (
            src && <iframe ref={frame} className="rh-yt" data-on={playing || undefined} src={src} title="Enginious showreel (background)" allow="autoplay; encrypted-media" aria-hidden="true" tabIndex={-1} onLoad={onFrameLoad} />
          )}
        </div>
        <span className="rh-shade" aria-hidden="true" />
        <span ref={spot} className="rh-spot" aria-hidden="true" />
      </div>

      <div ref={layerH} className="rh-hud" aria-hidden="true">
        <Edge variant="perimeter" duration={10} />
      </div>

      <div ref={layerT} className="container rh-copy">
        <p className="eyebrow">Enginious · Experiential technology</p>
        <h1>
          We engineer experiences <span className="accent">people step into.</span>
        </h1>
        <p className="rh-sub">
          Kinetic displays, interactive installations and immersive environments for events, exhibitions and permanent spaces. Headquartered in Dubai, with branches in Saudi Arabia and Poland serving Europe.
        </p>
        <div className="rh-cta">
          <Link href="/contact" className="btn btn-primary btn-lg">Start a project →</Link>
          <button type="button" className="btn btn-lg" onClick={() => setOpen(true)}>
            <span className="play" aria-hidden="true">▶</span> Watch the showreel
          </button>
        </div>
        <ul className="rh-places" aria-label="Where we are">
          <li><Link href="/uae">Dubai · HQ</Link></li>
          <li><Link href="/saudi-arabia">Saudi Arabia</Link></li>
          <li><Link href="/europe">Poland · Europe</Link></li>
        </ul>
      </div>

      <div className="rh-ctrl">
        {auto && playing && (
          <button type="button" className="rh-pause" onClick={toggle} aria-label={paused ? "Play background video" : "Pause background video"}>
            {paused ? "▶" : "❚❚"}
          </button>
        )}
      </div>
      <a href="#capabilities" className="rh-cue" aria-label="Scroll to what we deliver"><span /></a>
      <ShowreelDialog open={open} onClose={() => setOpen(false)} youtubeId={cfg.youtubeId} file={cfg.mode === "file" ? (cfg.mp4 ?? cfg.webm) : undefined} />
    </section>
  );
}
