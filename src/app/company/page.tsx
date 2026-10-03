import type { Metadata } from "next";
import Link from "next/link";
import { ReviewNote } from "@/components/ReviewNote";

export const metadata: Metadata = {
  title: "Company",
  description: "Where innovators meet artisans: Enginious's mission, vision and culture.",
  alternates: { canonical: "/company" },
};

const PILLARS = [
  { t: "Mission", b: "To empower companies to leverage cutting-edge technologies to captivate and convert potential customers in the most effective and efficient way possible." },
  { t: "Vision", b: "To revolutionise the event industry, automation and robotics sectors by pioneering cutting-edge, customisable technology solutions, and to be the leader in innovative, immersive experiences across the globe." },
  { t: "Culture", b: "Fuelling creativity, fostering collaboration and pushing boundaries. We embrace risk, encourage exploration and value open communication." },
];

export default function CompanyPage() {
  return (
    <div className="container section" style={{ paddingTop: "clamp(32px, 6vw, 80px)" }}>
      <p className="eyebrow">Company</p>
      <h1 style={{ marginTop: 12, maxWidth: "14ch" }}>
        Where <span className="accent">innovators</span> meet artisans.
      </h1>
      <p className="lede" style={{ marginTop: "1.25rem" }}>
        A tribe of engineers, creative artists and designers who push the boundaries of technology to captivate
        audiences, elevate brands and deliver transformative experiences.
      </p>
      <div className="three" style={{ marginTop: 48 }}>
        {PILLARS.map((p) => (
          <article key={p.t} className="panel" style={{ padding: 24 }}>
            <p className="eyebrow">{p.t}</p>
            <p style={{ marginTop: 12 }}>{p.b}</p>
          </article>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 40, flexWrap: "wrap" }}>
        <Link href="/company/team" className="btn btn-primary">Team &amp; leadership →</Link>
        <Link href="/europe" className="btn">Global presence</Link>
      </div>
      <div style={{ marginTop: 40 }}>
        <ReviewNote>Company story, process (brief to delivery), founding year and FAQs are scheduled for Milestone 2; mission/vision/culture are paraphrased from the Company Profile 2026 Q2.</ReviewNote>
      </div>
    </div>
  );
}
