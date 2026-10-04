"use server";

import { updateTag } from "next/cache";
import { supabaseUser } from "@/lib/supabase/server";
import { AuthError, assertStaff } from "@/lib/cms/auth";
import { fail, friendlyDbError, type ActionResult } from "@/lib/cms/result";

const authFail = (e: unknown) => {
  if (e instanceof AuthError) return fail(e.kind === "unauthenticated" ? "Your session has expired. Sign in again." : "You do not have permission to do that.", e.kind);
  throw e;
};
const STATUSES = ["real", "stock", "preview-portrait", "concept", "fictional-portrait"];

export interface MediaPatch { alt: string; title?: string; caption?: string; credit?: string; sourceUrl?: string; licence?: string; status: string; published: boolean; focalX: number; focalY: number; kind?: string }

export async function updateMedia(id: string, p: MediaPatch): Promise<ActionResult> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  if (!/^[a-z0-9-]{1,80}$/.test(id)) return fail("Invalid request.", "validation");
  const errors: Record<string, string> = {};
  if (!STATUSES.includes(p.status)) errors.status = "Choose a status.";
  if ((p.alt ?? "").length > 300) errors.alt = "Alt text is limited to 300 characters.";
  if (p.sourceUrl && !/^https?:\/\/[^\s]+$/.test(p.sourceUrl)) errors.sourceUrl = "Use a web address starting with http:// or https://.";
  if (!(p.focalX >= 0 && p.focalX <= 1 && p.focalY >= 0 && p.focalY <= 1)) errors.focal = "Focal point must be inside the image.";
  if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", "validation", errors);
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { data: cur } = await sb.from("media_assets").select("kind").eq("id", id).maybeSingle();
  if (!cur) return fail("That media no longer exists.", "not_found");
  if (cur.kind !== "document" && !(p.alt ?? "").trim()) return fail("Alt text is required for images.", "validation", { alt: "Describe the image for people who cannot see it." });
  const { data, error } = await sb.from("media_assets").update({
    alt: p.alt.trim(), title: p.title?.trim() || null, caption: p.caption?.trim() || null, credit: p.credit?.trim() || null, source_url: p.sourceUrl?.trim() || null,
    licence: p.licence?.trim() || null, status: p.status, published: p.published, focal_x: p.focalX, focal_y: p.focalY, updated_at: new Date().toISOString(),
  }).eq("id", id).select("id");
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  if (!data?.length) return fail("You do not have permission to do that.", "forbidden");
  updateTag("content");
  return { ok: true };
}

export async function mediaUsage(id: string): Promise<{ type: string; slug: string; title: string; in_published: boolean; item_id: string }[]> {
  try { await assertStaff(); } catch { return []; }
  const sb = await supabaseUser();
  const { data } = (await sb?.rpc("cms_media_references", { p_id: id })) ?? { data: [] };
  return (data ?? []) as never;
}

/** Delete only when nothing references the asset (published or draft); the database function enforces this. Files are removed afterwards. */
export async function deleteMedia(id: string): Promise<ActionResult> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { data, error } = await sb.rpc("cms_delete_media", { p_id: id });
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  const m = data as { storage_path: string; visibility: string; kind: string; variants: number[]; original_path: string | null };
  const bucket = m.visibility === "private" ? "private" : m.kind === "document" ? "documents" : "media";
  const paths = m.kind === "document" ? [m.storage_path] : (m.variants ?? []).map((w) => `${m.storage_path}-${w}.webp`);
  if (paths.length) await sb.storage.from(bucket).remove(paths);
  if (m.original_path) await sb.storage.from("private").remove([m.original_path]);
  updateTag("content");
  return { ok: true };
}
