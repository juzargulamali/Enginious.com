import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { WorkBrowser } from "@/components/WorkBrowser";
import { breadcrumbLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/work", pageKey: "work", title: "Work", description: "Experiential technology delivered by Enginious for events, exhibitions, brand activations and permanent installations across the Middle East and beyond." });
}

export default function WorkPage() {
  return (
    <div className="container section" style={{ paddingTop: "clamp(32px, 5vw, 64px)" }}>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Work", path: "/work" }])} />
      <p className="eyebrow">Work</p>
      <h1 style={{ marginTop: 12, maxWidth: "14ch" }}>Explore our <span className="accent">work.</span></h1>
      <p className="lede" style={{ marginTop: "1.25rem" }}>
        Delivered projects across the UAE, Saudi Arabia and international events. Only completed work is listed here.
      </p>
      <WorkBrowser />
    </div>
  );
}
