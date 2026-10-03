"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);
  return (
    <div className="container section" style={{ paddingTop: "clamp(48px, 8vw, 120px)" }}>
      <p className="eyebrow">Something went wrong</p>
      <h1 style={{ marginTop: 12, maxWidth: "14ch" }}>This page couldn&apos;t load.</h1>
      <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={reset}>Try again</button>
        <Link href="/" className="btn">Back to home</Link>
      </div>
      <details style={{ marginTop: 28, maxWidth: 720 }} className="muted">
        <summary>Technical details</summary>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem", marginTop: 8 }}>
          {error.name}: {error.message}
          {error.digest ? `\nDigest: ${error.digest}` : ""}
        </pre>
      </details>
    </div>
  );
}
