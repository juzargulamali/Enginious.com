"use client";

import Link from "next/link";

// Admin error boundary. Never prints the error message or stack (they can contain database details); only the opaque digest.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="adm-empty" role="alert">
      <h3>Something went wrong</h3>
      <p>This page could not be loaded. Nothing was lost. Try again, or go back to the dashboard.{error.digest ? ` Reference: ${error.digest}` : ""}</p>
      <p style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center" }}>
        <button type="button" className="adm-btn adm-btn-primary" onClick={reset}>Try again</button>
        <Link className="adm-btn" href="/admin">Dashboard</Link>
      </p>
    </div>
  );
}
