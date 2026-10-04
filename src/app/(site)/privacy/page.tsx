import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";
export const metadata: Metadata = { title: "Privacy notice", robots: { index: false }, alternates: { canonical: "/privacy" } };
export default function Privacy() {
  return (
    <ComingSoon eyebrow="Legal" title="Privacy notice." milestone="launch preparation">
      <p>Enquiry details are used only to respond to your enquiry. The full privacy notice needs legal review and will be added before launch.</p>
    </ComingSoon>
  );
}
