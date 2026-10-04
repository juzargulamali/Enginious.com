"use server";

import { revalidatePath, updateTag } from "next/cache";
import { supabaseUser } from "@/lib/supabase/server";
import { AuthError, assertAdministrator, assertStaff } from "@/lib/cms/auth";
import { cleanData, typeDef } from "@/lib/cms/schema";
import { fail, friendlyDbError, type ActionResult } from "@/lib/cms/result";
import { canImport, seedItems } from "@/lib/content/seed";

/**
 * Copy the built-in starter content for one type into the CMS as DRAFTS ONLY. Nothing is published, so the live site keeps
 * showing the built-in starter content until an administrator reviews the drafts and runs publishReviewedImport().
 * Existing CMS items are never overwritten.
 */
export async function importStarterContent(type: string): Promise<ActionResult<{ created: number; skipped: number }>> {
  try { await assertStaff(); } catch (e) {
    if (e instanceof AuthError) return fail(e.kind === "unauthenticated" ? "Your session has expired. Sign in again." : "You do not have permission to do that.", e.kind);
    throw e;
  }
  const def = typeDef(type);
  if (!def) return fail("Unknown content type.", "validation");
  const seeds = seedItems(def.type);
  if (!seeds.length) return fail("There is no starter content for this type.", "validation");
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");

  const { data: existing } = await sb.from("content_items").select("slug").eq("type", def.type).limit(2000);
  const have = new Set((existing ?? []).map((r: { slug: string }) => r.slug));
  const todo = seeds.filter((s) => !have.has(s.slug));
  if (!todo.length) return { ok: true, data: { created: 0, skipped: seeds.length } };

  const rows = todo.map((s) => ({ type: def.type, slug: s.slug, title: s.title, draft: cleanData(def, s.data).data, sort_order: s.sort_order, featured: s.featured, imported_at: new Date().toISOString() }));
  const { error } = await sb.from("content_items").insert(rows);
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  revalidatePath("/admin", "layout");
  return { ok: true, data: { created: rows.length, skipped: seeds.length - todo.length } };
}

/**
 * The explicit, reviewed publishing step (administrators only, enforced by the database). Publishes every imported draft of
 * the type in one all-or-nothing step and makes the CMS the source for that type on the live site.
 */
export async function publishReviewedImport(type: string, reviewed: boolean): Promise<ActionResult<{ published: number }>> {
  try { await assertAdministrator(); } catch (e) {
    if (e instanceof AuthError) return fail(e.kind === "unauthenticated" ? "Your session has expired. Sign in again." : "Only an administrator can publish imported content.", e.kind);
    throw e;
  }
  const def = typeDef(type);
  if (!def || !canImport(def.type)) return fail("This content type has no starter content.", "validation");
  if (!reviewed) return fail("Confirm that you have reviewed the imported content.", "validation");
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { data, error } = await sb.rpc("cms_publish_reviewed_import", { p_type: def.type, p_reviewed: true });
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  updateTag("content");
  revalidatePath("/", "layout");
  return { ok: true, data: { published: Number(data) || 0 } };
}
