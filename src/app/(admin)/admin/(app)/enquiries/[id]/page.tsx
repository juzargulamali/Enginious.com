import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/cms/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { dateTime } from "@/lib/cms/format";
import { EnquiryPanel } from "@/components/admin/EnquiryPanel";
import { notificationStatus } from "@/lib/notify";

export const metadata: Metadata = { title: "Enquiry" };

const LABEL: Record<string, string> = { uae: "Dubai (Global HQ)", ksa: "Saudi Arabia", europe: "Europe (Poland)", event: "Event or exhibition", permanent: "Permanent installation", other: "Something else" };

export default async function EnquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaffPage();
  const { id } = await params;
  const sb = await supabaseUser();
  if (!sb || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: e } = await sb.from("enquiries").select("*").eq("id", id).maybeSingle();
  if (!e) notFound();
  const [{ data: notes }, { data: atts }] = await Promise.all([
    sb.from("enquiry_notes").select("id,body,author_email,created_at").eq("enquiry_id", id).order("created_at", { ascending: true }),
    sb.from("enquiry_attachments").select("id,original_name,mime,bytes,created_at").eq("enquiry_id", id).order("created_at", { ascending: true }),
  ]);
  const ns = notificationStatus();
  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumbs"><Link href="/admin">Dashboard</Link> / <Link href="/admin/enquiries">Enquiries</Link> / {e.reference}</p>
          <h1>{e.name}</h1>
          <p>{e.company ? `${e.company} · ` : ""}{LABEL[e.region] ?? e.region} · received {dateTime(e.created_at)}</p>
        </div>
        <div className="adm-actions"><a className="adm-btn" href={`mailto:${e.email}?subject=${encodeURIComponent(`Re: your Enginious enquiry ${e.reference}`)}`}>Reply by email</a></div>
      </div>
      <div className="adm-editor">
        <div>
          <section className="adm-card">
            <h2>Message</h2>
            <p style={{ whiteSpace: "pre-wrap", marginTop: 10, overflowWrap: "anywhere" }}>{e.message}</p>
          </section>
          <section className="adm-card">
            <h2>Details</h2>
            <dl className="adm-kv" style={{ marginTop: 10 }}>
              <dt>Reference</dt><dd className="adm-mono">{e.reference}</dd>
              <dt>Email</dt><dd>{e.email}</dd>
              {e.country && <><dt>Project country</dt><dd>{e.country}</dd></>}
              {e.project_type && <><dt>Type</dt><dd>{LABEL[e.project_type] ?? e.project_type}</dd></>}
              {e.event_date && <><dt>Event date</dt><dd>{e.event_date}</dd></>}
              {e.budget && <><dt>Budget</dt><dd>{e.budget}</dd></>}
              <dt>Selected experiences</dt><dd>{e.technologies?.length ? e.technologies.join(", ") : "None"}</dd>
              {e.source_path && <><dt>Sent from</dt><dd className="adm-mono">{e.source_path}</dd></>}
            </dl>
          </section>
          <EnquiryPanel enquiryId={e.id} status={e.status} notes={(notes ?? []) as never} attachments={(atts ?? []) as never} notification={{ status: e.notification_status, error: e.notification_error, attempts: e.notification_attempts, last: e.notification_last_at, configured: ns.configured, label: ns.label }} isAdmin={staff.role === "administrator"} />
        </div>
        <aside className="adm-sidepanel" aria-label="Summary">
          <section className="adm-card">
            <h2>Status</h2>
            <p style={{ marginTop: 8 }}><span className="adm-badge" data-s={e.status}>{e.status.replace("_", " ")}</span></p>
            <p className="adm-help" style={{ marginTop: 10 }}>Notes are internal and never shown publicly.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
