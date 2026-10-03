import Link from "next/link";
import type { ReactNode } from "react";

/** Honest placeholder for pages scheduled for a later milestone. Never shows invented content. */
export function ComingSoon({ eyebrow, title, children, milestone = "Milestone 2" }: { eyebrow: string; title: string; children?: ReactNode; milestone?: string }) {
  return (
    <div className="container section" style={{ paddingTop: "clamp(32px, 6vw, 80px)" }}>
      <p className="eyebrow">{eyebrow}</p>
      <h1 style={{ marginTop: 12, maxWidth: "16ch" }}>{title}</h1>
      <div className="stack lede" style={{ marginTop: "1.5rem", ["--stack" as string]: "1rem" }}>{children}</div>
      <p className="review-note" style={{ marginTop: 28, maxWidth: 640 }} role="note">
        <strong>REVIEW:</strong> This page is scheduled for {milestone}. See docs/BACKLOG.md.
      </p>
      <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
        <Link href="/contact" className="btn btn-primary">Start a project →</Link>
        <Link href="/" className="btn">Back to home</Link>
      </div>
    </div>
  );
}
