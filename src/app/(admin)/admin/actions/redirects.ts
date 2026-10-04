"use server";

import { revalidatePath } from "next/cache";
import { supabaseUser } from "@/lib/supabase/server";
import { AuthError, assertStaff } from "@/lib/cms/auth";
import { fail, friendlyDbError, type ActionResult } from "@/lib/cms/result";

const authFail = (e: unknown) => {
  if (e instanceof AuthError) return fail(e.kind === "unauthenticated" ? "Your session has expired. Sign in again." : "You do not have permission to do that.", e.kind);
  throw e;
};

export async function saveRedirect(input: { id?: string; source: string; target: string; status: number; enabled: boolean; note?: string }): Promise<ActionResult> {
  let staff;
  try { staff = await assertStaff(); } catch (e) { return authFail(e); }
  const source = (input.source ?? "").trim();
  const target = (input.target ?? "").trim();
  const errors: Record<string, string> = {};
  if (!/^\/[A-Za-z0-9/_.~%-]*$/.test(source) || source.length > 200) errors.source = "Start with / and use only letters, numbers and - _ . ~ / %.";
  if (/^\/(admin|api|_next)(\/|$)/.test(source)) errors.source = "Admin, API and internal paths cannot be redirected.";
  const internal = /^\/[A-Za-z0-9/_.~%?=&#-]*$/.test(target) && !target.startsWith("//");
  const external = /^https:\/\/[A-Za-z0-9.-]+(:[0-9]{1,5})?(\/[^\s@\\]*)?$/.test(target);
  if (!internal && !external) errors.target = "Use a path on this site (starting with a single /) or a plain https:// address (no @ or backslashes).";
  if (![301, 302, 307, 308].includes(input.status)) errors.status = "Choose a redirect type.";
  if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", "validation", errors);
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const row = { source_path: source.length > 1 ? source.replace(/\/+$/, "") : source, target, status_code: input.status, enabled: input.enabled, note: (input.note ?? "").slice(0, 300) || null };
  const { error } = input.id ? await sb.from("redirects").update(row).eq("id", input.id) : await sb.from("redirects").insert({ ...row, created_by: staff.id });
  if (error) {
    const f = friendlyDbError(error);
    return fail(f.code === "conflict" ? "A redirect from that address already exists." : f.error, f.code, f.code === "conflict" ? { source: "Already exists." } : /target|host|loop|itself/i.test(f.error) ? { target: f.error } : undefined);
  }
  revalidatePath("/admin/redirects");
  return { ok: true };
}

export async function deleteRedirect(id: string): Promise<ActionResult> {
  try { await assertStaff(); } catch (e) { return authFail(e); }
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { error } = await sb.from("redirects").delete().eq("id", id);
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  revalidatePath("/admin/redirects");
  return { ok: true };
}
