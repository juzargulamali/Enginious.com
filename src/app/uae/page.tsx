import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { REGIONS } from "@/content/site";
export const metadata: Metadata = { title: "UAE", description: "Enginious in the UAE: global headquarters in Dubai.", alternates: { canonical: "/uae" } };
export default function Uae() {
  return (
    <ComingSoon eyebrow="Regions · UAE" title="Dubai, global headquarters.">
      <p>Our global headquarters is in Dubai. Contact: {REGIONS.uae.email} · {REGIONS.uae.phone}</p>
    </ComingSoon>
  );
}
