"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin, supabaseUser } from "@/lib/supabase/server";
import { AuthError, assertAdministrator, assertStaff } from "@/lib/cms/auth";
import { fail, friendlyDbError, type ActionResult } from "@/lib/cms/result";
import { notifyEnquiry } from "@/lib/enquiry-notify";

const authFail = (e: unknown) => {
  if (e instanceof AuthError) return fail(e.kind === "unauthenticated" ? "Your session has expired. Sign in again." : "You do not have permission to do that.", e.kind);
  throw e;
};
const ID = /^[0-9a-f-]{36}$/i;
const STATUSES = ["new", "in_progress", "closed", "spam"] as const;

export async function setEnquiryStatus(id: string, status: string): Promise<ActionResult> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  if (!ID.test(id) || !(STATUSES as readonly string[]).includes(status)) return fail("Invalid request.", "validation");
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { data, error } = await sb.from("enquiries").update({ status }).eq("id", id).select("id");
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  if (!data?.length) return fail("That enquiry no longer exists, or you cannot change it.", "not_found");
  revalidatePath("/admin/enquiries");
  return { ok: true };
}

export async function addNote(id: string, body: string): Promise<ActionResult> {
  let staff;
  try { staff = await assertStaff(); } catch (e) { return authFail(e); }
  const text = (body ?? "").trim();
  if (!ID.test(id)) return fail("Invalid request.", "validation");
  if (!text) return fail("Write a note first.", "validation", { note: "Write a note first." });
  if (text.length > 4000) return fail("Notes can be up to 4000 characters.", "validation", { note: "Too long." });
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { error } = await sb.from("enquiry_notes").insert({ enquiry_id: id, author: staff.id, author_email: staff.email, body: text });
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  return { ok: true };
}

/** Re-send the staff notification for a stored enquiry. Uses the service role only after the staff check. */
export async function retryNotification(id: string): Promise<ActionResult<{ status: string; error?: string }>> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  if (!ID.test(id)) return fail("Invalid request.", "validation");
  const sb = await supabaseUser();
  const { data } = (await sb?.from("enquiries").select("id").eq("id", id).maybeSingle()) ?? { data: null };
  if (!data) return fail("That enquiry no longer exists.", "not_found");
  const r = await notifyEnquiry(id, { retry: true });
  revalidatePath(`/admin/enquiries/${id}`);
  return { ok: true, data: r };
}

/** Short-lived signed link to a private attachment. Access is checked by storage policy (staff only). */
export async function attachmentUrl(attachmentId: string): Promise<ActionResult<{ url: string }>> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  if (!ID.test(attachmentId)) return fail("Invalid request.", "validation");
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { data: att } = await sb.from("enquiry_attachments").select("storage_path").eq("id", attachmentId).maybeSingle();
  if (!att) return fail("Attachment not found.", "not_found");
  const { data, error } = await sb.storage.from("enquiry-attachments").createSignedUrl(att.storage_path as string, 60);
  if (error || !data) return fail("Could not open the attachment.", "unavailable");
  return { ok: true, data: { url: data.signedUrl } };
}

async function removeFiles(paths: string[]) {
  const admin = supabaseAdmin();
  if (admin && paths.length) await admin.storage.from("enquiry-attachments").remove(paths);
}

export async function deleteEnquiry(id: string): Promise<ActionResult> {
  try { await assertAdministrator(); } catch (e) { return authFail(e); }
  if (!ID.test(id)) return fail("Invalid request.", "validation");
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { data: atts } = await sb.from("enquiry_attachments").select("storage_path").eq("enquiry_id", id);
  const { data, error } = await sb.from("enquiries").delete().eq("id", id).select("id,reference");
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  if (!data?.length) return fail("You do not have permission to do that.", "forbidden");
  await removeFiles(((atts ?? []) as { storage_path: string }[]).map((a) => a.storage_path));
  await sb.rpc("cms_audit_log", { p_action: "enquiry.delete", p_target: String(data[0].reference), p_detail: {} });
  revalidatePath("/admin/enquiries");
  return { ok: true };
}

/** Retention: delete closed/spam enquiries older than N days (at least 30), and their files. The period is an owner decision. */
export async function purgeEnquiries(days: number): Promise<ActionResult<{ deleted: number }>> {
  try { await assertAdministrator(); } catch (e) { return authFail(e); }
  const n = Math.trunc(Number(days));
  if (!Number.isFinite(n) || n < 30) return fail("Choose at least 30 days.", "validation");
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { data, error } = await sb.rpc("cms_purge_enquiries", { p_older_than_days: n });
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  const res = data as { deleted: number; paths: string[] };
  await removeFiles(res.paths ?? []);
  revalidatePath("/admin/enquiries");
  return { ok: true, data: { deleted: res.deleted } };
}
