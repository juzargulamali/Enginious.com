import type { Metadata } from "next";
import { RegionPage } from "@/components/RegionPage";
import { getContent } from "@/lib/content/load";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/saudi-arabia", pageKey: "saudi-arabia", title: "Saudi Arabia", description: "Enginious in Saudi Arabia: our branch in the Kingdom." });
}

export default async function Page() {
  return <RegionPage regionKey="ksa" content={await getContent()} />;
}
