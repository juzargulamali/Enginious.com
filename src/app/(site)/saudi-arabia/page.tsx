import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { REGIONS } from "@/content/site";
export const metadata: Metadata = { title: "Saudi Arabia", description: "Enginious in Saudi Arabia: our branch in the Kingdom.", alternates: { canonical: "/saudi-arabia" } };
export default function Ksa() {
  return (
    <ComingSoon eyebrow="Regions · Saudi Arabia" title="Our branch in the Kingdom.">
      <p>Contact: {REGIONS.ksa.email} · {REGIONS.ksa.phone}</p>
    </ComingSoon>
  );
}
