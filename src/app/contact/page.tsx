import type { Metadata } from "next";
import { Suspense } from "react";
import { EnquiryForm } from "@/components/EnquiryForm";
import { ReviewNote } from "@/components/ReviewNote";

export const metadata: Metadata = {
  title: "Contact / Start a project",
  description: "Tell Enginious about your project. Choose the Dubai, Saudi Arabia or Poland (Europe) team and we will connect you with the right people.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="container section" style={{ paddingTop: "clamp(32px, 5vw, 64px)" }}>
      <p className="eyebrow">Contact / Start a project</p>
      <h1 style={{ marginTop: 12, maxWidth: "16ch" }}>
        Let&apos;s build something worth <span className="accent">experiencing.</span>
      </h1>
      <p className="lede" style={{ margin: "1.25rem 0 2.5rem" }}>Tell us your idea. We&apos;ll connect you with the right team.</p>
      <Suspense fallback={<p className="muted">Loading form…</p>}>
        <EnquiryForm />
      </Suspense>
      <div style={{ marginTop: 28, display: "grid", gap: 10 }}>
        <ReviewNote>Dubai and Saudi Arabia contacts come from the Company Profile 2026 Q2 (KSA: Lubna). Poland has no confirmed contact, so Europe falls back to the general contact.</ReviewNote>
        <ReviewNote>Not yet live: brief attachments, and email notification to the team (needs a provider and recipients). Enquiries are stored in the database once the enquiries migration is applied.</ReviewNote>
      </div>
    </div>
  );
}
