import type { Metadata } from "next";
import { ReviewNote } from "@/components/ReviewNote";
import { WorkBrowser } from "@/components/WorkBrowser";

export const metadata: Metadata = {
  title: "Work",
  description: "Experiential technology delivered by Enginious for events, exhibitions, brand activations and permanent installations across the Middle East and beyond.",
  alternates: { canonical: "/work" },
};

export default function WorkPage() {
  return (
    <div className="container section" style={{ paddingTop: "clamp(32px, 5vw, 64px)" }}>
      <p className="eyebrow">Work</p>
      <h1 style={{ marginTop: 12, maxWidth: "14ch" }}>Explore our <span className="accent">work.</span></h1>
      <p className="lede" style={{ marginTop: "1.25rem" }}>
        Delivered projects across the UAE, Saudi Arabia and international events. Only completed work is listed here.
      </p>
      <WorkBrowser />
      <div style={{ marginTop: 28 }}>
        <ReviewNote>
          All projects are taken from the Company Profile 2026 Q2 and require client approval before launch. Empty
          &ldquo;Client&rdquo; lines mean the profile did not name one. Sector and region tags are editorial.
        </ReviewNote>
      </div>
    </div>
  );
}
