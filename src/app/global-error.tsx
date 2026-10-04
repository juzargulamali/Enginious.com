"use client";

// Last-resort boundary when the root layout itself fails. Plain and self-contained; shows no technical detail.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#02070b", color: "#e8f3f5", fontFamily: "system-ui, sans-serif", padding: "10vh 24px", textAlign: "center" }}>
        <h1>Something went wrong.</h1>
        <p>Please try again in a moment.</p>
        <button type="button" onClick={reset} style={{ padding: "10px 18px", borderRadius: 8, border: 0, background: "#27cdd8", color: "#00181b", fontWeight: 700, cursor: "pointer" }}>Try again</button>
      </body>
    </html>
  );
}
