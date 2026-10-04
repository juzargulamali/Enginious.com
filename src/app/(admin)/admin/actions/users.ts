"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseAdmin, supabaseUser } from "@/lib/supabase/server";
import { AuthError, assertAdministrator } from "@/lib/cms/auth";
import { fail, friendlyDbError, type ActionResult } from "@/lib/cms/result";
import { publicOrigin } from "@/lib/seo/indexing";

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const ROLES = ["administrator", "editor"] as const;
const ID = /^[0-9a-f-]{36}$/i;
const authFail = (e: unknown) => {
  if (e instanceof AuthError) return fail(e.kind === "unauthenticated" ? "Your session has expired. Sign in again." : "Only administrators can manage access.", e.kind);
  throw e;
};
async function origin() {
  // Prefer the configured public origin; headers are only a fallback for previews and local work.
  const configured = publicOrigin();
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Invite someone. Invite-only: this is the ONLY way a CMS role is created. The invitation email is sent by Supabase Auth;
 * the role row is created here with the service key AFTER an administrator is verified server-side. Never callable by editors.
 */
export async function inviteUser(input: { email: string; role: string }): Promise<ActionResult<{ email: string }>> {
  let admin;
  try { admin = await assertAdministrator(); } catch (e) { return authFail(e); }
  const email = (input.email ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return fail("Enter a valid email address.", "validation", { email: "Enter a valid email address." });
  if (!(ROLES as readonly string[]).includes(input.role)) return fail("Choose a role.", "validation", { role: "Choose a role." });
  const svc = supabaseAdmin();
  if (!svc) return fail("SUPABASE_SERVICE_ROLE_KEY is not set, so invitations cannot be sent yet. See docs/cms-setup.md.", "unavailable");
  const { data, error } = await svc.auth.admin.inviteUserByEmail(email, { redirectTo: `${await origin()}/admin/auth/callback` });
  if (error || !data.user) {
    if (/already|registered|exists/i.test(error?.message ?? "")) {
      // The person already has an account (for example another Enginious tool). Give them a role without sending a new invite.
      // Look through ALL pages (a project may be shared with other tools), and only grant access to an account whose email was
      // actually confirmed: an unconfirmed account could have been registered by someone else in advance.
      let existing: { id: string; email_confirmed_at?: string | null } | undefined;
      for (let page = 1; page <= 20 && !existing; page++) {
        const { data: list } = await svc.auth.admin.listUsers({ page, perPage: 200 });
        if (!list?.users.length) break;
        existing = list.users.find((u) => u.email?.toLowerCase() === email);
        if (list.users.length < 200) break;
      }
      if (!existing) return fail("That email already has an account but it could not be found. Try again.", "unavailable");
      if (!existing.email_confirmed_at) return fail("That address has an account whose email was never confirmed, so access cannot be granted safely. Ask them to confirm it, or remove the account in Supabase, then invite again.", "validation");
      const ins = await svc.from("cms_roles").upsert({ user_id: existing.id, role: input.role, email, invited_by: admin.id, disabled: false }, { onConflict: "user_id" });
      if (ins.error) return fail("Could not grant access. Please try again.", "unavailable");
      revalidatePath("/admin/users");
      return { ok: true, data: { email } };
    }
    return fail("The invitation could not be sent. Please check the address and try again.", "unavailable");
  }
  const ins = await svc.from("cms_roles").upsert({ user_id: data.user.id, role: input.role, email, invited_by: admin.id, disabled: false }, { onConflict: "user_id" });
  if (ins.error) return fail("The invitation was sent but the role could not be saved. Try inviting again.", "unavailable");
  const sb = await supabaseUser();
  await sb?.rpc("cms_audit_log", { p_action: "user.invite", p_target: email, p_detail: { role: input.role } });
  revalidatePath("/admin/users");
  return { ok: true, data: { email } };
}

export async function changeRole(userId: string, role: string): Promise<ActionResult> {
  try { await assertAdministrator(); } catch (e) { return authFail(e); }
  if (!ID.test(userId) || !(ROLES as readonly string[]).includes(role)) return fail("Invalid request.", "validation");
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { data, error } = await sb.from("cms_roles").update({ role }).eq("user_id", userId).select("user_id,email");
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  if (!data?.length) return fail("That user was not found.", "not_found");
  await sb.rpc("cms_audit_log", { p_action: "user.role", p_target: String(data[0].email ?? userId), p_detail: { role } });
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setDisabled(userId: string, disabled: boolean): Promise<ActionResult> {
  try { await assertAdministrator(); } catch (e) { return authFail(e); }
  if (!ID.test(userId)) return fail("Invalid request.", "validation");
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { data, error } = await sb.from("cms_roles").update({ disabled }).eq("user_id", userId).select("user_id,email");
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  if (!data?.length) return fail("That user was not found.", "not_found");
  await sb.rpc("cms_audit_log", { p_action: disabled ? "user.disable" : "user.enable", p_target: String(data[0].email ?? userId), p_detail: {} });
  revalidatePath("/admin/users");
  return { ok: true };
}

/** Remove CMS access (the sign-in account itself is kept). */
export async function removeAccess(userId: string): Promise<ActionResult> {
  try { await assertAdministrator(); } catch (e) { return authFail(e); }
  if (!ID.test(userId)) return fail("Invalid request.", "validation");
  const sb = await supabaseUser();
  if (!sb) return fail("The CMS is not connected to its database.", "unavailable");
  const { data, error } = await sb.from("cms_roles").delete().eq("user_id", userId).select("user_id,email");
  if (error) { const f = friendlyDbError(error); return fail(f.error, f.code); }
  if (!data?.length) return fail("That user was not found.", "not_found");
  await sb.rpc("cms_audit_log", { p_action: "user.remove", p_target: String(data[0].email ?? userId), p_detail: {} });
  revalidatePath("/admin/users");
  return { ok: true };
}
