import type { Metadata } from "next";
import { RegionPage } from "@/components/RegionPage";
import { getContent } from "@/lib/content/load";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/europe", pageKey: "europe", title: "Europe", description: "Enginious in Europe: our Poznań, Poland branch connecting European projects with global creative and engineering capabilities." });
}

export default async function Page() {
  return <RegionPage regionKey="europe" content={await getContent()} />;
}
