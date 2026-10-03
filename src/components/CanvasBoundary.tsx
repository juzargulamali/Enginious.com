"use client";

import { Component, type ReactNode } from "react";

/** Keeps a failure in the interactive visual from taking down the whole page. */
export class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("Interactive visual failed; showing static fallback.", error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="panel" style={{ display: "grid", placeItems: "center", minHeight: 320, padding: 24, textAlign: "center" }}>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/enginious-mark.svg" alt="" width={160} style={{ opacity: 0.8, margin: "0 auto" }} />
          <p className="muted" style={{ marginTop: 16 }}>The interactive visual is unavailable on this device.</p>
        </div>
      </div>
    );
  }
}
