import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";

export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

// Rendered with a 404 status for any address that does not exist (and for admin-managed items that were unpublished or archived).
export default function NotFound() {
  return (
    <SiteShell>
      <div className="container section" style={{ paddingTop: "clamp(48px, 8vw, 120px)" }}>
        <p className="eyebrow">404</p>
        <h1 style={{ marginTop: 12, maxWidth: "14ch" }}>This page <span className="accent">is not here.</span></h1>
        <p className="lede" style={{ marginTop: "1.25rem", maxWidth: "52ch" }}>The address may have changed, or the page may no longer be published. Try one of these instead.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
          <Link href="/" className="btn btn-primary">Home</Link>
          <Link href="/work" className="btn">Our work</Link>
          <Link href="/technologies" className="btn">Technologies</Link>
          <Link href="/contact" className="btn">Contact</Link>
        </div>
      </div>
    </SiteShell>
  );
}
