import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
import { SERVICES } from "@/content/site";

export const metadata: Metadata = { title: "Solutions", description: "What you can commission from Enginious: experiential technology, content, software and engineering.", alternates: { canonical: "/solutions" } };

export default function Solutions() {
  return (
    <ComingSoon eyebrow="Solutions" title="What you can commission.">
      <p>Enginious combines strategy, content, software, hardware and integration. Today&apos;s list, with full pages to follow:</p>
      <ul style={{ paddingLeft: "1.2rem" }}>{SERVICES.map((s) => <li key={s.title}>{s.title}</li>)}</ul>
    </ComingSoon>
  );
}
