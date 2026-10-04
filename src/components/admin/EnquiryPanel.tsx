"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addNote, attachmentUrl, deleteEnquiry, retryNotification, setEnquiryStatus } from "@/app/(admin)/admin/actions/enquiries";
import { dateTime, timeAgo } from "@/lib/cms/format";
import { formatBytes } from "@/lib/upload";

interface Note { id: string; body: string; author_email: string | null; created_at: string }
interface Att { id: string; original_name: string; mime: string; bytes: number }

const NEXT: { value: string; label: string }[] = [{ value: "new", label: "New" }, { value: "in_progress", label: "In progress" }, { value: "closed", label: "Closed" }, { value: "spam", label: "Spam" }];

export function EnquiryPanel({ enquiryId, status, notes, attachments, notification, isAdmin }: { enquiryId: string; status: string; notes: Note[]; attachments: Att[]; notification: { status: string; error: string | null; attempts: number; last: string | null; configured: boolean; label: string }; isAdmin: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const report = (r: { ok: boolean; error?: string }, okText: string) => { setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "Failed" }); if (r.ok) router.refresh(); };

  return (
    <>
      <section className="adm-card" aria-labelledby="st-h">
        <h2 id="st-h">Triage</h2>
        <div className="adm-actions" style={{ marginTop: 10 }} role="group" aria-label="Set status">
          {NEXT.map((n) => <button key={n.value} type="button" className={`adm-btn ${status === n.value ? "adm-btn-primary" : ""}`} aria-pressed={status === n.value} disabled={pending || status === n.value} onClick={() => start(async () => report(await setEnquiryStatus(enquiryId, n.value), `Marked ${n.label.toLowerCase()}.`))}>{n.label}</button>)}
        </div>
        {msg && <p className={msg.ok ? "adm-help" : "adm-err"} role="status" style={{ marginTop: 8 }}>{msg.text}</p>}
      </section>

      <section className="adm-card" aria-labelledby="att-h">
        <h2 id="att-h">Attachments</h2>
        {attachments.length === 0 ? <p className="adm-hint" style={{ marginTop: 8 }}>No files were attached.</p> : (
          <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 8 }}>
            {attachments.map((a) => (
              <li key={a.id} style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ overflowWrap: "anywhere" }}>{a.original_name} <span className="adm-help">({a.mime.split("/")[1]}, {formatBytes(a.bytes)})</span></span>
                <button type="button" className="adm-btn adm-btn-sm" disabled={pending} onClick={() => start(async () => { const r = await attachmentUrl(a.id); if (r.ok) window.open(r.data.url, "_blank", "noopener"); else setMsg({ ok: false, text: r.error }); })}>Open (link expires in 1 minute)</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="adm-card" aria-labelledby="notif-h">
        <h2 id="notif-h">Email notification to staff</h2>
        <p style={{ marginTop: 8 }}><span className="adm-badge" data-s={notification.status === "sent" ? "sent" : notification.status === "failed" ? "failed" : "closed"}>{notification.status}</span> <span className="adm-help">{notification.attempts} attempt{notification.attempts === 1 ? "" : "s"}{notification.last ? ` · last ${timeAgo(notification.last)}` : ""}</span></p>
        {notification.error && <p className="adm-err" style={{ marginTop: 6 }}>{notification.error}</p>}
        <p className="adm-help" style={{ marginTop: 6 }}>Provider: {notification.label}. The enquiry is stored whether or not an email goes out.</p>
        {notification.status !== "sent" && (
          <button type="button" className="adm-btn" style={{ marginTop: 10 }} disabled={pending} onClick={() => start(async () => { const r = await retryNotification(enquiryId); if (r.ok) { setMsg({ ok: r.data.status === "sent", text: r.data.status === "sent" ? "Notification sent." : r.data.error ?? `Notification ${r.data.status}.` }); router.refresh(); } else setMsg({ ok: false, text: r.error }); })}>Retry notification</button>
        )}
      </section>

      <section className="adm-card" aria-labelledby="notes-h">
        <h2 id="notes-h">Internal notes</h2>
        {notes.length === 0 ? <p className="adm-hint" style={{ marginTop: 8 }}>No notes yet.</p> : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {notes.map((n) => <div className="adm-note" key={n.id}><small>{n.author_email ?? "Unknown"} · {dateTime(n.created_at)}</small><span style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{n.body}</span></div>)}
          </div>
        )}
        <form className="adm-form" style={{ marginTop: 14 }} onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addNote(enquiryId, note); if (r.ok) setNote(""); report(r, "Note added."); }); }}>
          <div className="adm-field"><label htmlFor="note">Add a note</label><textarea id="note" value={note} maxLength={4000} onChange={(e) => setNote(e.target.value)} /></div>
          <div className="adm-actions"><button type="submit" className="adm-btn" disabled={pending || !note.trim()}>Add note</button></div>
        </form>
      </section>

      {isAdmin && (
        <section className="adm-card" aria-labelledby="del-h">
          <h2 id="del-h">Delete</h2>
          <p className="adm-hint" style={{ margin: "6px 0 12px" }}>Removes the enquiry, its notes and attachments permanently. Administrators only.</p>
          <button type="button" className="adm-btn adm-btn-danger" disabled={pending} onClick={() => { if (window.confirm("Permanently delete this enquiry, its notes and attachments?")) start(async () => { const r = await deleteEnquiry(enquiryId); if (r.ok) router.push("/admin/enquiries"); else setMsg({ ok: false, text: r.error }); }); }}>Delete enquiry</button>
        </section>
      )}
    </>
  );
}
