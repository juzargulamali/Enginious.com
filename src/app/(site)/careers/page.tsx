import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
export const metadata: Metadata = { title: "Careers", description: "Careers and internships at Enginious.", alternates: { canonical: "/careers" } };
export default function Careers() {
  return (
    <ComingSoon eyebrow="Careers" title="Build what comes next.">
      <p>There are no open vacancies listed at the moment. Careers, internships and an application route will appear here.</p>
    </ComingSoon>
  );
}
