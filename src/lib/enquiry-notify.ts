import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { enquiryEmail, isEmail, sendNotification, type EnquiryForEmail } from "@/lib/notify";
import { metadataOrigin } from "@/lib/seo/indexing";

const MAX_ATTEMPTS = 10;

/** Recipients for a region: the internal "_notify_to" list on the region item in the CMS, else NOTIFY_FALLBACK_TO. */
async function recipientsFor(region: string): Promise<string[]> {
  const db = supabaseAdmin();
  const list: string[] = [];
  if (db) {
    const { data } = await db.from("content_items").select("draft").eq("type", "region").eq("slug", region).maybeSingle();
    const v = (data?.draft as { _notify_to?: unknown } | undefined)?._notify_to;
    if (Array.isArray(v)) list.push(...v.filter((x): x is string => typeof x === "string"));
  }
  if (!list.length) list.push(...(process.env.NOTIFY_FALLBACK_TO ?? "").split(",").map((s) => s.trim()));
  return [...new Set(list.filter(isEmail))];
}

/**
 * Send (or retry) the staff notification for a STORED enquiry and record the outcome on the row.
 * Never throws: a notification problem must not affect the stored enquiry or the visitor's confirmation.
 */
export async function notifyEnquiry(enquiryId: string, opts: { retry?: boolean } = {}): Promise<{ status: "sent" | "failed" | "skipped"; error?: string }> {
  const db = supabaseAdmin();
  if (!db) return { status: "failed", error: "Database unavailable." };
  try {
    const { data: e } = await db.from("enquiries").select("*").eq("id", enquiryId).maybeSingle();
    if (!e) return { status: "failed", error: "Enquiry not found." };
    if (opts.retry && e.notification_attempts >= MAX_ATTEMPTS) return { status: "failed", error: "Retry limit reached." };
    const to = await recipientsFor(e.region);
    const msg = enquiryEmail(e as EnquiryForEmail, `${metadataOrigin()}/admin/enquiries/${e.id}`);
    const result = await sendNotification({ ...msg, to });
    const status = result.ok ? "sent" : result.skipped ? "skipped" : "failed";
    await db.from("enquiries").update({
      notification_status: status,
      notification_error: result.ok ? null : result.error.slice(0, 300),
      notification_attempts: (e.notification_attempts ?? 0) + (status === "skipped" ? 0 : 1),
      notification_last_at: new Date().toISOString(),
      ...(result.ok ? { notified_at: new Date().toISOString() } : {}),
    }).eq("id", enquiryId);
    return { status, error: result.ok ? undefined : result.error };
  } catch {
    await db.from("enquiries").update({ notification_status: "failed", notification_error: "Unexpected error while sending.", notification_last_at: new Date().toISOString() }).eq("id", enquiryId);
    return { status: "failed", error: "Unexpected error while sending." };
  }
}
