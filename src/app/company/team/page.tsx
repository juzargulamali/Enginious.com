import type { Metadata } from "next";
import Link from "next/link";
import "@/components/neon/neon.css";
import { TeamGallery } from "@/components/home/TeamGallery";
import { Edge } from "@/components/neon/Edge";
import { NeonController } from "@/components/neon/NeonController";

export const metadata: Metadata = {
  title: "Team & leadership",
  description: "Meet the engineers, creators and problem-solvers behind Enginious, and the leadership guiding the company.",
  alternates: { canonical: "/company/team" },
};

export default function TeamPage() {
  return (
    <div className="container section" style={{ paddingTop: "clamp(90px, 9vw, 130px)" }}>
      <NeonController />
      <p className="eyebrow">People · Inside the Enginious world</p>
      <h1 style={{ marginTop: 12, maxWidth: "16ch" }}>Meet the <span className="accent">minds</span> behind the experience.</h1>
      <p className="lede" style={{ marginTop: "1.25rem" }}>Engineers. Creators. Problem-solvers. One connected team across Dubai, Saudi Arabia and Poland.</p>
      <TeamGallery />
      <div className="panel" style={{ position: "relative", marginTop: 56, padding: "clamp(24px, 4vw, 48px)", display: "flex", gap: 16, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <Edge variant="left" duration={10} />
        <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2.4rem)" }}>Build what comes next.</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/careers" className="btn btn-primary">Explore careers →</Link>
          <Link href="/company" className="btn">About Enginious</Link>
        </div>
      </div>
    </div>
  );
}
