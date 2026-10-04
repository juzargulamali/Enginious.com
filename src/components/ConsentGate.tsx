"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { isAllowedAnalyticsSrc, readConsent, sanitizeEventProps, writeConsent, type Consent } from "@/lib/consent";

/**
 * The analytics INTEGRATION POINT. It is inert unless NEXT_PUBLIC_ANALYTICS_SRC is set to an https script URL
 * (NEXT_PUBLIC_ANALYTICS_DOMAIN optionally sets data-domain). When configured it shows a consent choice and loads the script
 * only after the visitor accepts. Declining or ignoring the choice loads nothing. No provider is built in or tested here: pick one,
 * set the variables, and verify with docs/analytics.md. Events go through trackEvent(), which strips personal data.
 */
const SRC = process.env.NEXT_PUBLIC_ANALYTICS_SRC;
const DOMAIN = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
const snapshot = (): Consent => readConsent();
const server = (): Consent => "denied"; // render nothing on the server

export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined" || readConsent() !== "granted") return;
  const w = window as unknown as { __enginiousTrack?: (n: string, p: Record<string, unknown>) => void };
  w.__enginiousTrack?.(name, sanitizeEventProps(props));
}

export function ConsentGate() {
  const consent = useSyncExternalStore(subscribe, snapshot, server);
  const [loaded, setLoaded] = useState(false);
  const enabled = isAllowedAnalyticsSrc(SRC);

  useEffect(() => {
    if (!enabled || consent !== "granted" || loaded) return;
    const s = document.createElement("script");
    s.src = SRC!; s.defer = true;
    if (DOMAIN) s.setAttribute("data-domain", DOMAIN);
    document.head.appendChild(s);
    const t = window.setTimeout(() => setLoaded(true), 0);
    return () => window.clearTimeout(t);
  }, [enabled, consent, loaded]);

  if (!enabled || consent !== "unset") return null;
  const choose = (v: "granted" | "denied") => { writeConsent(v); listeners.forEach((l) => l()); };
  return (
    <div role="region" aria-label="Analytics consent" className="consent-bar" style={{ position: "fixed", insetInline: 16, bottom: 16, zIndex: 80, maxWidth: 560, marginInline: "auto", padding: "14px 18px", borderRadius: 14, background: "rgba(5,16,26,.96)", border: "1px solid var(--line-strong, rgba(39,205,216,.5))", display: "grid", gap: 10 }}>
      <p style={{ margin: 0, fontSize: ".92rem" }}>We would like to use privacy-friendly analytics to see which pages are useful. Nothing is collected unless you agree, and no personal details are included.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={() => choose("granted")}>Accept analytics</button>
        <button type="button" className="btn" onClick={() => choose("denied")}>No thanks</button>
      </div>
    </div>
  );
}
