import type { Metadata } from "next";
import { Showroom } from "@/components/Showroom";
import { ReviewNote } from "@/components/ReviewNote";

export const metadata: Metadata = {
  title: "Technologies",
  description:
    "Explore Enginious technologies: kinetic displays, interactive installations, immersive environments, AI activations and robotics.",
  alternates: { canonical: "/technologies" },
};

export default function TechnologiesPage() {
  return (
    <div className="container section" style={{ paddingTop: "clamp(32px, 5vw, 64px)" }}>
      <p className="eyebrow">Technologies · Digital showroom</p>
      <h1 style={{ marginTop: 12, maxWidth: "14ch" }}>
        Enter the world of <span className="accent">Enginious.</span>
      </h1>
      <p className="lede" style={{ margin: "1.25rem 0 2rem" }}>
        Explore the technologies that turn ideas into experiences. Pick a category, focus on an exhibit and add what
        you like to your project brief.
      </p>
      <Showroom />
      <div style={{ marginTop: 24 }}>
        <ReviewNote>
          Technology list is drawn from the Company Profile 2026 Q2. Specifications, real demo videos and equipment
          imagery are still to be supplied; exhibit glyphs are abstract.
        </ReviewNote>
      </div>
    </div>
  );
}
