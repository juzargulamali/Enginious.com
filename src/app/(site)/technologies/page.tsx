import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { Showroom } from "@/components/Showroom";
import { breadcrumbLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/technologies", pageKey: "technologies", title: "Technologies", description: "Explore Enginious technologies: kinetic displays, interactive installations, immersive environments, AI activations and robotics." });
}

export default function TechnologiesPage() {
  return (
    <div className="container section" style={{ paddingTop: "clamp(32px, 5vw, 64px)" }}>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Technologies", path: "/technologies" }])} />
      <p className="eyebrow">Technologies · Digital showroom</p>
      <h1 style={{ marginTop: 12, maxWidth: "14ch" }}>
        Enter the world of <span className="accent">Enginious.</span>
      </h1>
      <p className="lede" style={{ margin: "1.25rem 0 2rem" }}>
        Explore the technologies that turn ideas into experiences. Pick a category, focus on an exhibit and add what
        you like to your project brief.
      </p>
      <Showroom />
    </div>
  );
}
