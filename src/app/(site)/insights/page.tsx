import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
export const metadata: Metadata = { title: "Insights", description: "Project stories, technology explainers and guidance from Enginious.", alternates: { canonical: "/insights" } };
export default function Insights() {
  return (
    <ComingSoon eyebrow="Insights" title="Stories and guidance.">
      <p>Project stories, technology explainers and behind-the-scenes engineering will be published here. No articles have been published yet.</p>
    </ComingSoon>
  );
}
