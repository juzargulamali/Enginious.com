import "server-only";
import { appendFile } from "node:fs/promises";

/**
 * Enquiry notification adapter. A notification is an INTERNAL email to staff; visitors are never emailed from here.
 * Storing the enquiry never depends on this: callers record the outcome (sent / failed / skipped) and can retry from /admin.
 *
 * Providers (NOTIFY_PROVIDER):
 *   resend       - https://resend.com HTTP API. Needs RESEND_API_KEY and NOTIFY_FROM (a verified sender address).
 *   outbox-file  - LOCAL TESTING ONLY: appends JSON lines to NOTIFY_OUTBOX_FILE. Refused on production deployments.
 *   (unset)      - not configured: notifications are recorded as "skipped".
 * Safety: NOTIFY_OVERRIDE_TO redirects EVERY notification to one authorised test address and prefixes the subject with [TEST].
 */
export interface NotifyMessage { to: string[]; subject: string; text: string; replyTo?: string }
export type NotifyResult = { ok: true } | { ok: false; skipped?: boolean; error: string };

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
export const isEmail = (s: string) => EMAIL.test(s);

const isProductionDeploy = () => process.env.VERCEL_ENV === "production" || (process.env.NODE_ENV === "production" && !!process.env.VERCEL);

export function notificationStatus(): { configured: boolean; provider: string | null; label: string } {
  const p = process.env.NOTIFY_PROVIDER;
  if (p === "resend") {
    const ready = !!process.env.RESEND_API_KEY && !!process.env.NOTIFY_FROM;
    return { configured: ready, provider: "resend", label: ready ? `Resend configured${process.env.NOTIFY_OVERRIDE_TO ? " (test override active)" : ""}` : "Resend selected but RESEND_API_KEY or NOTIFY_FROM is missing" };
  }
  if (p === "outbox-file") return { configured: !isProductionDeploy() && !!process.env.NOTIFY_OUTBOX_FILE, provider: "outbox-file", label: "Local test outbox" };
  return { configured: false, provider: null, label: "Not configured (enquiries are stored, no emails are sent)" };
}

/** Never put provider error bodies (which may echo addresses) into the database or logs. */
const safeError = (status: number) => (status === 401 || status === 403 ? "Provider rejected the credentials or sender." : status === 422 ? "Provider rejected the message." : status === 429 ? "Provider rate limit reached." : `Provider error (${status}).`);

export async function sendNotification(msg: NotifyMessage): Promise<NotifyResult> {
  const st = notificationStatus();
  if (!st.configured || !st.provider) return { ok: false, skipped: true, error: "Notifications are not configured." };
  const override = process.env.NOTIFY_OVERRIDE_TO?.trim();
  const to = override ? [override] : msg.to;
  const recipients = to.filter(isEmail);
  if (!recipients.length) return { ok: false, skipped: true, error: "No valid recipients are configured for this region." };
  const subject = override ? `[TEST] ${msg.subject}` : msg.subject;

  if (st.provider === "outbox-file") {
    try {
      await appendFile(process.env.NOTIFY_OUTBOX_FILE!, JSON.stringify({ to: recipients, subject, text: msg.text, replyTo: msg.replyTo ?? null, at: new Date().toISOString() }) + "\n");
      return { ok: true };
    } catch { return { ok: false, error: "Could not write the test outbox." }; }
  }

  try {
    const res = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.NOTIFY_FROM, to: recipients, subject, text: msg.text, ...(msg.replyTo && isEmail(msg.replyTo) ? { reply_to: msg.replyTo } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? { ok: true } : { ok: false, error: safeError(res.status) };
  } catch {
    return { ok: false, error: "Could not reach the email provider." };
  }
}

export interface EnquiryForEmail {
  reference: string; region: string; name: string; email: string; company: string | null; country: string | null;
  project_type: string | null; event_date: string | null; budget: string | null; message: string; technologies: string[]; attachment_count?: number;
}

/** Plain-text body for staff. The CMS link points at the inbox; the full details are also in the email so no login is needed to triage. */
export function enquiryEmail(e: EnquiryForEmail, adminUrl: string): NotifyMessage {
  const lines = [
    `New enquiry ${e.reference} (${e.region.toUpperCase()})`, "",
    `Name: ${e.name}`, `Email: ${e.email}`, ...(e.company ? [`Company: ${e.company}`] : []), ...(e.country ? [`Project country: ${e.country}`] : []),
    ...(e.project_type ? [`Type: ${e.project_type}`] : []), ...(e.event_date ? [`Event date: ${e.event_date}`] : []), ...(e.budget ? [`Budget: ${e.budget}`] : []),
    ...(e.technologies.length ? [`Selected experiences: ${e.technologies.join(", ")}`] : []), ...(e.attachment_count ? [`Attachments: ${e.attachment_count} (open the CMS to view)`] : []), "",
    e.message, "", `Open in the CMS: ${adminUrl}`,
  ];
  return { to: [], subject: `New enquiry ${e.reference} from ${e.name}`.slice(0, 150), text: lines.join("\n"), replyTo: e.email };
}
