"use server";

import { revalidatePath, updateTag } from "next/cache";
import { supabaseUser } from "@/lib/supabase/server";
import { AuthError, assertStaff } from "@/lib/cms/auth";
import { cleanData, typeDef } from "@/lib/cms/schema";
import { fail, friendlyDbError, type ActionResult } from "@/lib/cms/result";
import { seedItems } from "@/lib/content/seed";

/**
 * Bring the built-in starter content for one type under CMS control. It creates any missing items and publishes them, so
 * the public site looks exactly the same afterwards but is now edited here. Existing CMS items are never overwritten.
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

  const rows = todo.map((s) => ({ type: def.type, slug: s.slug, title: s.title, draft: cleanData(def, s.data).data, sort_order: s.sort_order, featured: s.featured }));
  const { data: inserted, error } = await sb.from("content_items").insert(rows).select("id,slug");
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  let published = 0;
  for (const row of (inserted ?? []) as { id: string; slug: string }[]) {
    const { error: pe } = await sb.rpc("cms_publish", { p_id: row.id });
    if (!pe) published++;
  }
  updateTag("content");
  revalidatePath("/", "layout");
  return { ok: true, data: { created: published, skipped: seeds.length - todo.length } };
}
