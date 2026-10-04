import type { Metadata } from "next";
import Link from "next/link";
import { getContent } from "@/lib/content/load";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const m = await buildMetadata({ path: "/privacy", pageKey: "privacy", title: "Privacy notice", description: "How Enginious handles the details you send through this website." });
  return { ...m, robots: { index: false, follow: true } };
}

// PROVISIONAL: this describes what the website actually does today. It is not legal advice and must be reviewed and approved
// (retention period, controller details, lawful basis, regional requirements) before launch. See docs/privacy-retention.md.
export default async function Privacy() {
  const c = await getContent();
  const provisional = c.settings.privacyStatus !== "approved";
  const email = c.settings.contactEmail;
  return (
    <section className="container section" style={{ paddingTop: "clamp(32px, 6vw, 80px)", maxWidth: 820 }}>
      <p className="eyebrow">Legal</p>
      <h1 style={{ marginTop: 12, fontSize: "clamp(2rem, 5vw, 3.4rem)" }}>Privacy notice</h1>
      {provisional && <p className="panel" role="note" style={{ marginTop: 20, padding: "14px 18px", borderColor: "var(--warn)" }}><b>Provisional.</b> This notice is a working draft describing how this website handles information today. It is awaiting review and approval and may change.</p>}
      <div className="stack md prose" style={{ marginTop: 28, ["--stack" as string]: "1.1rem" }}>
        <h2>What you send us</h2>
        <p>When you send an enquiry, we collect the details you type into the form: your name, work email, company, project country, project type, date and budget range (if given), your message, the experiences you selected, and any files you attach.</p>
        <h2>How we use it</h2>
        <p>We use these details only to respond to your enquiry. They are stored in a secure database that only authorised Enginious staff can open, and our team may be notified by email so someone can reply. Attached files are stored privately and are never published.</p>
        <h2>What this website does not do</h2>
        <p>The website does not use advertising trackers. Your project shortlist is kept only in your own browser until you send an enquiry. If analytics are added in future, they will load only after you agree.</p>
        <h2>How long we keep it</h2>
        <p>The retention period is to be confirmed. Until it is, enquiries are kept only as long as needed to deal with them and may be deleted on request.</p>
        <h2>Your requests</h2>
        <p>To ask what we hold about you, or to have it corrected or deleted, email <a href={`mailto:${email}`}>{email}</a> and quote your enquiry reference.</p>
        <p><Link href="/contact" className="accent">Back to contact →</Link></p>
      </div>
    </section>
  );
}
