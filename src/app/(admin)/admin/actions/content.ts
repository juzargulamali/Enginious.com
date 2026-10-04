"use server";

import { revalidatePath, updateTag } from "next/cache";
import { supabaseUser } from "@/lib/supabase/server";
import { AuthError, assertAdministrator, assertStaff } from "@/lib/cms/auth";
import { cleanData, SLUG_RE, slugify, typeDef, validateForPublish, type Data } from "@/lib/cms/schema";
import { fail, friendlyDbError, type ActionResult } from "@/lib/cms/result";
import { getItem } from "@/lib/cms/items";

const authFail = (e: unknown) => {
  if (e instanceof AuthError) return fail(e.kind === "unauthenticated" ? "Your session has expired. Sign in again." : "You do not have permission to do that.", e.kind);
  throw e;
};

/** Publishing, unpublishing and archiving change the public site: drop the cached content straight away. */
function refreshPublic() {
  updateTag("content");
  revalidatePath("/", "layout");
}

export async function createItem(input: { type: string; title: string; slug?: string }): Promise<ActionResult<{ id: string }>> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  const def = typeDef(input.type);
  if (!def) return fail("Unknown content type.", "validation");
  const title = (input.title ?? "").trim().slice(0, 200);
  if (!title) return fail(`${def.titleLabel} is required.`, "validation", { title: `${def.titleLabel} is required.` });
  const slug = (input.slug ?? "").trim() || slugify(title);
  if (!SLUG_RE.test(slug) || slug.length > 80) return fail("The slug can only contain lowercase letters, numbers and single hyphens.", "validation", { slug: "Use lowercase letters, numbers and hyphens, for example my-new-page." });
  if (def.fixedSlugs && !def.fixedSlugs.includes(slug)) return fail(`This type only allows the slugs: ${def.fixedSlugs.join(", ")}.`, "validation", { slug: `Allowed: ${def.fixedSlugs.join(", ")}` });
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { data, error } = await sb.from("content_items").insert({ type: def.type, slug, title, draft: {}, sort_order: 0, featured: false }).select("id").single();
  if (error) {
    const f = friendlyDbError(error);
    return fail(f.code === "conflict" ? `The slug "${slug}" is already used by another ${def.label.toLowerCase()}.` : f.error, f.code, f.code === "conflict" ? { slug: "Already in use. Choose another slug." } : undefined);
  }
  return { ok: true, data: { id: data.id as string } };
}

export interface SavePayload {
  id: string;
  expectedVersion: number;
  title: string;
  slug: string;
  data: Data;
  sortOrder?: number;
  featured?: boolean;
}

export async function saveDraft(p: SavePayload): Promise<ActionResult<{ version: number; updatedAt: string }>> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const item = await getItem(p.id);
  if (!item) return fail("That item no longer exists.", "not_found");
  const def = typeDef(item.type)!;
  const title = (p.title ?? "").trim().slice(0, 200);
  const slug = (p.slug ?? "").trim();
  const errors: Record<string, string> = {};
  if (!title) errors.title = `${def.titleLabel} is required.`;
  if (!SLUG_RE.test(slug) || slug.length > 80) errors.slug = "Use lowercase letters, numbers and single hyphens.";
  if (def.fixedSlugs && !def.fixedSlugs.includes(slug)) errors.slug = `This type only allows: ${def.fixedSlugs.join(", ")}.`;
  const { data, errors: fieldErrors } = cleanData(def, p.data);
  Object.assign(errors, fieldErrors);
  if (Object.keys(errors).length) return fail("Some fields need attention before this can be saved.", "validation", errors);

  const update: Record<string, unknown> = { title, slug, draft: data };
  if (def.orderable && Number.isFinite(p.sortOrder)) update.sort_order = Math.trunc(p.sortOrder!);
  if (def.featurable && typeof p.featured === "boolean") update.featured = p.featured;
  // Optimistic concurrency: only save if nobody else changed the item since it was loaded.
  const { data: rows, error } = await sb.from("content_items").update(update).eq("id", p.id).eq("version", p.expectedVersion).select("version,updated_at");
  if (error) {
    const f = friendlyDbError(error);
    return fail(f.code === "conflict" ? `The slug "${slug}" is already used.` : f.error, f.code, f.code === "conflict" ? { slug: "Already in use. Choose another slug." } : undefined);
  }
  if (!rows || rows.length === 0) return fail("Someone else saved changes to this item after you opened it. Reload to see their version before saving yours.", "conflict");
  return { ok: true, data: { version: rows[0].version as number, updatedAt: rows[0].updated_at as string } };
}

export async function checkSlug(input: { type: string; slug: string; exceptId?: string }): Promise<{ ok: boolean; available?: boolean; message?: string }> {
  try { await assertStaff(); } catch { return { ok: false }; }
  const def = typeDef(input.type);
  if (!def) return { ok: false };
  if (!SLUG_RE.test(input.slug) || input.slug.length > 80) return { ok: true, available: false, message: "Use lowercase letters, numbers and single hyphens." };
  const sb = await supabaseUser();
  if (!sb) return { ok: false };
  const { data, error } = await sb.rpc("cms_slug_available", { p_type: def.type, p_slug: input.slug, p_locale: "en", p_except: input.exceptId ?? null });
  if (error) return { ok: false };
  return { ok: true, available: data === true, message: data === true ? undefined : "Already in use by another item of this type." };
}

export async function publishItem(id: string): Promise<ActionResult<{ version: number }>> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const item = await getItem(id);
  if (!item) return fail("That item no longer exists.", "not_found");
  const def = typeDef(item.type)!;
  const { data, errors: formatErrors } = cleanData(def, item.draft);
  const errors = { ...formatErrors, ...validateForPublish(def, item.title, data) };
  if (Object.keys(errors).length) return fail("This cannot be published yet. Fix the highlighted fields first.", "validation", errors);
  const { data: res, error } = await sb.rpc("cms_publish", { p_id: id });
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  refreshPublic();
  return { ok: true, data: { version: (res as { version: number }).version } };
}

async function simple(fn: "cms_unpublish" | "cms_archive" | "cms_restore", id: string): Promise<ActionResult> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { error } = await sb.rpc(fn, { p_id: id });
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  refreshPublic();
  return { ok: true };
}
export const unpublishItem = async (id: string) => simple("cms_unpublish", id);
export const archiveItem = async (id: string) => simple("cms_archive", id);
export const restoreItem = async (id: string) => simple("cms_restore", id);

export async function restoreRevision(id: string, revisionId: number): Promise<ActionResult> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { error } = await sb.rpc("cms_restore_revision", { p_id: id, p_revision_id: revisionId });
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  return { ok: true };
}

export async function deleteItem(id: string): Promise<ActionResult> {
  try { await assertAdministrator(); } catch (e) { return authFail(e); }
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const item = await getItem(id);
  if (!item) return fail("That item no longer exists.", "not_found");
  if (item.status !== "archived") return fail("Archive the item first. Only archived items can be deleted.", "validation");
  const { data, error } = await sb.from("content_items").delete().eq("id", id).select("id");
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  if (!data?.length) return fail("You do not have permission to do that.", "forbidden");
  await sb.rpc("cms_audit_log", { p_action: "content.delete", p_target: `${item.type}/${item.slug}`, p_detail: { title: item.title } });
  refreshPublic();
  return { ok: true };
}

/** Move an item up or down within its type by swapping sort_order with its neighbour. */
export async function moveItem(id: string, direction: "up" | "down"): Promise<ActionResult> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const item = await getItem(id);
  if (!item) return fail("That item no longer exists.", "not_found");
  const { data } = await sb.from("content_items").select("id,sort_order,title").eq("type", item.type).neq("status", "archived").order("sort_order", { ascending: true }).order("title", { ascending: true });
  const list = (data ?? []) as { id: string; sort_order: number }[];
  const i = list.findIndex((x) => x.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  // Renumber the whole list so ties never leave an item stuck.
  const order = list.map((x) => x.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (let n = 0; n < order.length; n++) {
    const target = list.find((x) => x.id === order[n])!;
    if (target.sort_order !== (n + 1) * 10) {
      const { error } = await sb.from("content_items").update({ sort_order: (n + 1) * 10 }).eq("id", order[n]);
      if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
    }
  }
  return { ok: true };
}

export async function setFeatured(id: string, featured: boolean): Promise<ActionResult> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { error } = await sb.from("content_items").update({ featured }).eq("id", id);
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  return { ok: true };
}

/** Apply the current order and featured flags of already-published items to the live site (does not publish text edits). */
export async function applyOrder(type: string): Promise<ActionResult<{ changed: number }>> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  const def = typeDef(type);
  if (!def) return fail("Unknown content type.", "validation");
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { data, error } = await sb.rpc("cms_apply_order", { p_type: def.type });
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  refreshPublic();
  return { ok: true, data: { changed: Number(data) || 0 } };
}
