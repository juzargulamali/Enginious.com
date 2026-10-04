import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { supabaseUser } from "@/lib/supabase/server";

export type Role = "administrator" | "editor";
export interface Staff {
  id: string;
  email: string;
  role: Role;
}

export class AuthError extends Error {
  constructor(public readonly kind: "unauthenticated" | "forbidden") {
    super(kind);
  }
}

/**
 * The signed-in CMS user, or null. The session is verified with the auth server (getUser), and the role is read from
 * public.cms_roles through RLS, so a user with no role row, or a disabled one, is not staff.
 */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const sb = await supabaseUser();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const { data: row } = await sb.from("cms_roles").select("role, disabled").eq("user_id", user.id).maybeSingle();
  if (!row || row.disabled) return null;
  return { id: user.id, email: user.email ?? "", role: row.role as Role };
});

/** For pages: redirect to the login screen when not signed in. */
export async function requireStaffPage(): Promise<Staff> {
  const s = await getStaff();
  if (!s) redirect("/admin/login");
  return s;
}
export async function requireAdministratorPage(): Promise<Staff> {
  const s = await requireStaffPage();
  if (s.role !== "administrator") redirect("/admin?denied=1");
  return s;
}

/** For Server Actions and Route Handlers: throw, never redirect, so callers can return a clean error. */
export async function assertStaff(): Promise<Staff> {
  const s = await getStaff();
  if (!s) throw new AuthError("unauthenticated");
  return s;
}
export async function assertAdministrator(): Promise<Staff> {
  const s = await assertStaff();
  if (s.role !== "administrator") throw new AuthError("forbidden");
  return s;
}
