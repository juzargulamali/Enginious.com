import type { Metadata } from "next";
import { Suspense } from "react";
import "./contact.css";
import "@/components/neon/neon.css";
import { EnquiryForm } from "@/components/EnquiryForm";
import { NeonController } from "@/components/neon/NeonController";
import { Photo, hasPhoto } from "@/components/Photo";

export const metadata: Metadata = {
  title: "Contact / Start a project",
  description: "Tell Enginious about your project. Choose the Dubai, Saudi Arabia or Poland (Europe) team and we will connect you with the right people.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="ct-hero">
      <NeonController />
      {hasPhoto("contactScene") && <div className="ct-scene" aria-hidden="true"><Photo slot="contactScene" sizes="100vw" priority /></div>}
      <div className="ct-stage" aria-hidden="true"><span className="haze" /><span className="floor" /><span className="beam b1" /><span className="beam b2" /><span className="beam b3" /><span className="shard s1" /><span className="shard s2" /><span className="shard s3" /></div>
      <div className="container">
        <p className="eyebrow">Contact / Start a project</p>
        <h1 style={{ marginTop: 12 }}>Let&apos;s build something worth <span className="accent">experiencing.</span></h1>
        <p className="lede" style={{ margin: "1.2rem 0 0" }}>Tell us your idea. We&apos;ll connect you with the right team.</p>
        <Suspense fallback={<p className="muted" style={{ marginTop: 30 }}>Loading form…</p>}>
          <EnquiryForm />
        </Suspense>
      </div>
    </div>
  );
}
