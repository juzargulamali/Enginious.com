"use client";

import Link from "next/link";

// Public error boundary. It never prints the error message or stack (they can contain database or provider details);
// only the opaque digest, which support can look up in the server logs.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container section" style={{ paddingTop: "clamp(48px, 8vw, 120px)" }}>
      <p className="eyebrow">Something went wrong</p>
      <h1 style={{ marginTop: 12, maxWidth: "14ch" }}>This page couldn&apos;t load.</h1>
      <p className="muted" style={{ marginTop: 16 }}>Please try again. If it keeps happening, email us{error.digest ? ` and quote reference ${error.digest}` : ""}.</p>
      <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={reset}>Try again</button>
        <Link href="/" className="btn">Back to home</Link>
      </div>
    </div>
  );
}
