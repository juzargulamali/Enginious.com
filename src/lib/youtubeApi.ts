"use client";

// The official YouTube IFrame Player API, loaded once and only when a preview is first needed (never at page load).
/* eslint-disable @typescript-eslint/no-explicit-any */
let loading: Promise<any> | null = null;

export function loadYouTubeApi(): Promise<any> {
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { try { prev?.(); } catch { /* ignore */ } resolve(w.YT); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = () => { loading = null; reject(new Error("YouTube API blocked")); };
    document.head.appendChild(s);
  });
  return loading;
}
