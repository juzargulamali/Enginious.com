import type { Metadata } from "next";
import { Suspense } from "react";
import "./contact.css";
import "@/components/neon/neon.css";
import { EnquiryForm } from "@/components/EnquiryForm";
import { NeonController } from "@/components/neon/NeonController";
import { Photo } from "@/components/Photo";
import { Markdown } from "@/components/Markdown";
import { buildMetadata } from "@/lib/seo/metadata";
import { getContent } from "@/lib/content/load";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/contact", pageKey: "contact", title: "Contact / Start a project", description: "Tell Enginious about your project. Choose the Dubai, Saudi Arabia or Poland (Europe) team and we will connect you with the right people." });
}

export default async function ContactPage() {
  const content = await getContent();
  const scene = content.images[content.slots.contactScene ?? "contact-scene"];
  return (
    <div className="ct-hero">
      <NeonController />
      {scene && <div className="ct-scene" aria-hidden="true"><Photo slot="contactScene" sizes="100vw" priority /></div>}
      <div className="ct-stage" aria-hidden="true"><span className="haze" /><span className="floor" /><span className="beam b1" /><span className="beam b2" /><span className="beam b3" /><span className="shard s1" /><span className="shard s2" /><span className="shard s3" /></div>
      <div className="container">
        <p className="eyebrow">Contact / Start a project</p>
        <h1 style={{ marginTop: 12 }}>Let&apos;s build something worth <span className="accent">experiencing.</span></h1>
        <p className="lede" style={{ margin: "1.2rem 0 0" }}>Tell us your idea. We&apos;ll connect you with the right team.</p>
        <Suspense fallback={<p className="muted" style={{ marginTop: 30 }}>Loading form…</p>}>
          <EnquiryForm />
        </Suspense>
        {content.faqs.length > 0 && (
          <section className="ct-faq" aria-labelledby="faq-h" style={{ marginTop: 56 }}>
            <p className="eyebrow">Questions</p>
            <h2 id="faq-h" style={{ marginTop: 10, fontSize: "clamp(1.5rem, 3vw, 2.2rem)" }}>Before you send an enquiry.</h2>
            <div style={{ marginTop: 18, display: "grid", gap: 10, maxWidth: 820 }}>
              {content.faqs.map((f) => (
                <details key={f.slug} className="ct-card ct-acc" style={{ padding: "14px 18px" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>{f.question}</summary>
                  <div style={{ marginTop: 10 }}><Markdown source={f.answer} /></div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
