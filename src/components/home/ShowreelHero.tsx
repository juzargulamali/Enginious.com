"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Edge } from "@/components/neon/Edge";
import { AtriumEnv, AtriumFrame, AtriumPlanes } from "./AtriumScene";
import { ShowreelDialog } from "./ShowreelDialog";
import type { ShowreelConfig } from "@/content/media";

/**
 * The Enginious Digital Atrium (design exploration): the approved showreel, framed as the lit screen at the far end of a hall.
 *  - Three depths: distant environment (AtriumEnv + AtriumFrame: static, painted once), middle (the screen in real CSS 3D, with
 *    its receding planes, light rails and floor light baked into ONE SVG), foreground (headline, buttons, regional strip).
 *  - The poster and a neutral dark screen are always painted first (fast LCP; the hero is never empty). The video fades in only
 *    when it is really playing. Nothing loads for reduced motion, Save-Data or 2G/3G; those visitors get the poster and a play cue.
 *  - Muted loop, pauses offscreen, visible pause control (WCAG 2.2.2). Sound lives in the lightbox.
 *  - Motion: pointer parallax (mouse only) and a small scroll transition. One rAF scheduler writes four transforms (planes, screen,
 *    two copy blocks), no React state, no filters; layers are promoted only while something is moving (will-change is set on
 *    the first movement and removed when the scene is at rest); the loop stops off-screen, with the tab hidden or motion reduced.
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
  const planesRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const fgA = useRef<HTMLDivElement>(null);
  const fgB = useRef<HTMLDivElement>(null);
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

  // ---- depth: pointer parallax (mouse only) + a small scroll transition. Nearer layers move more; the environment never moves.
  // State lives in plain variables; one rAF writes four transforms; the loop sleeps as soon as everything is at rest, and
  // the layers are only promoted (will-change) while they are actually moving.
  useEffect(() => {
    const root = hero.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wide = window.matchMedia("(min-width: 901px)");
    const layers = () => [planesRef.current, midRef.current, fgA.current, fgB.current];
    let raf = 0, tx = 0, ty = 0, x = 0, y = 0, s = 0, onScreen = true, promoted = false, idle = 0;
    const promote = (on: boolean) => {
      if (promoted === on) return;
      promoted = on;
      for (const el of layers()) if (el) el.style.willChange = on ? "transform" : "";
    };
    const apply = () => {
      raf = 0;
      x += (tx - x) * 0.1; y += (ty - y) * 0.1;
      const settled = Math.abs(tx - x) < 0.002 && Math.abs(ty - y) < 0.002;
      if (settled) { x = tx; y = ty; }
      const pl = planesRef.current, mid = midRef.current, a = fgA.current, b = fgB.current;
      // nearer = larger pointer shift and faster scroll (the hero leaves in front of its own environment)
      if (pl) pl.style.transform = `translate3d(${(-x * 6).toFixed(2)}px, ${(-y * 4 - s * 10).toFixed(2)}px, 0)`;
      if (mid) mid.style.transform = `translate3d(${(-x * 9).toFixed(2)}px, ${(-y * 6 - s * 22).toFixed(2)}px, 0)`;
      const fg = `translate3d(${(-x * 11).toFixed(2)}px, ${(-y * 7 - s * 44).toFixed(2)}px, 0)`;
      if (a) a.style.transform = fg;
      if (b) b.style.transform = fg;
      if (!settled && onScreen) raf = requestAnimationFrame(apply);
      else { window.clearTimeout(idle); idle = window.setTimeout(() => promote(false), 700); }
    };
    const kick = () => { if (!raf && onScreen && !document.hidden) { window.clearTimeout(idle); promote(true); raf = requestAnimationFrame(apply); } };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !wide.matches) return;
      // links and buttons must hold still under the cursor: freeze the layers where they are the moment the pointer is over one
      if ((e.target as Element | null)?.closest?.("a, button")) { tx = x; ty = y; return; }
      const r = root.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      kick();
    };
    const leave = () => { tx = 0; ty = 0; kick(); };
    const scroll = () => {
      const h = root.offsetHeight || 1;
      const next = Math.min(1, Math.max(0, window.scrollY / h));
      if (next !== s) { s = next; kick(); }
    };
    const onVis = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; promote(false); } else kick(); };
    // only listen to scrolling while the hero is actually on screen
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) { window.addEventListener("scroll", scroll, { passive: true }); scroll(); }
      else { window.removeEventListener("scroll", scroll); cancelAnimationFrame(raf); raf = 0; promote(false); }
    }, { threshold: 0 });
    io.observe(root);
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect(); window.removeEventListener("scroll", scroll); cancelAnimationFrame(raf); window.clearTimeout(idle);
      root.removeEventListener("pointermove", move); root.removeEventListener("pointerleave", leave); document.removeEventListener("visibilitychange", onVis);
    };
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
      {/* 1. distant environment + the dark opening (decorative) */}
      <div className="rh-env" aria-hidden="true"><AtriumEnv /></div>
      <AtriumFrame />

      {/* 3. foreground: headline, actions, regional presence. DOM order = reading order: headline, showreel (with its pause control), description and actions */}
      <div ref={fgA} className="container rh-copy rh-copy-a">
        <p className="eyebrow">Enginious · Experiential technology</p>
        <h1>
          We engineer experiences <span className="accent">people step into.</span>
        </h1>
      </div>

      {/* 2. middle: the showreel screen, set in two receding planes and a pair of light rails (real 3D, one transform) */}
      <div className="rh-midpos">
        <div ref={planesRef} className="rh-planes" aria-hidden="true"><AtriumPlanes /></div>
        <div ref={midRef} className="rh-mid">
          <div className="rh-screen" onClick={() => setOpen(true)}>
            <div className="rh-media">
              <div className="rh-screen-base" aria-hidden="true"><span>Enginious showreel</span></div>
              {poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="rh-poster" src={cfg.poster} alt="" fetchPriority="high" decoding="async" onError={() => setPosterOk(false)} />
              )}
              {cfg.mode === "file" ? (
                <video ref={video} className="rh-video" data-on={playing || undefined} muted loop playsInline preload="auto" aria-hidden="true" tabIndex={-1} onPlaying={() => setPlaying(true)} />
              ) : (
                src && <iframe ref={frame} className="rh-yt" data-on={playing || undefined} src={src} title="Enginious showreel (background)" allow="autoplay; encrypted-media" aria-hidden="true" tabIndex={-1} onLoad={onFrameLoad} />
              )}
              <span className="rh-glass" aria-hidden="true" />
              <span className="rh-playcue" data-hide={(auto && playing) || undefined} aria-hidden="true">▶</span>
            </div>
            <Edge variant="perimeter" duration={10} />
            <div className="rh-ctrl">
              {auto && playing && (
                <button type="button" className="rh-pause" onClick={(e) => { e.stopPropagation(); toggle(); }} aria-label={paused ? "Play background video" : "Pause background video"}>
                  {paused ? "▶" : "❚❚"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div ref={fgB} className="container rh-copy rh-copy-b">
        <p className="rh-sub">
          Kinetic displays, interactive installations and immersive environments for events, exhibitions and permanent spaces. Headquartered in Dubai, with branches in Saudi Arabia and Poland serving Europe.
        </p>
        <div className="rh-cta">
          <Link href="/contact" className="btn btn-primary btn-lg">Start a project →</Link>
          <button type="button" className="btn btn-lg" onClick={() => setOpen(true)}>
            <span className="play" aria-hidden="true">▶</span> Watch the showreel
          </button>
        </div>
      </div>

      <nav className="rs" aria-label="Where we are" data-neon>
        <Link href="/uae" className="rs-n"><i aria-hidden="true" /><b>Dubai</b><span>Global Headquarters</span></Link>
        <span className="rs-l" aria-hidden="true"><em /></span>
        <Link href="/saudi-arabia" className="rs-n"><i aria-hidden="true" /><b>Riyadh</b><span>Saudi Arabia Branch</span></Link>
        <span className="rs-l" aria-hidden="true"><em /></span>
        <Link href="/europe" className="rs-n"><i aria-hidden="true" /><b>Poland</b><span>Europe</span></Link>
      </nav>

      <a href="#capabilities" className="rh-cue" aria-label="Scroll to what we deliver"><span /></a>
      <ShowreelDialog open={open} onClose={() => setOpen(false)} youtubeId={cfg.youtubeId} file={cfg.mode === "file" ? (cfg.mp4 ?? cfg.webm) : undefined} />
    </section>
  );
}
