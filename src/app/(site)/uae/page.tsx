import type { Metadata } from "next";
import { RegionPage } from "@/components/RegionPage";
import { getContent } from "@/lib/content/load";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/uae", pageKey: "uae", title: "UAE", description: "Enginious in the UAE: global headquarters in Dubai. Experiential technology, services and delivered projects across Dubai, Abu Dhabi and the UAE." });
}

export default async function Page() {
  return <RegionPage regionKey="uae" content={await getContent()} />;
}
