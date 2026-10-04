"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseUser } from "@/lib/supabase/server";
import { getStaff } from "@/lib/cms/auth";

export interface AuthState { error?: string; message?: string }

const safeNext = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/admin") && !s.startsWith("//") && !s.includes("\\") ? s : "/admin";
};
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!EMAIL.test(email) || password.length < 1) return { error: "Enter your email and password." };
  const sb = await supabaseUser();
  if (!sb) return { error: "The CMS is not connected to its database yet. See docs/HANDOVER.md." };
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: "Email or password is incorrect." };
  const staff = await getStaff();
  if (!staff) {
    await sb.auth.signOut();
    return { error: "This account has not been given CMS access. Ask an administrator to invite you." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const sb = await supabaseUser();
  await sb?.auth.signOut();
  redirect("/admin/login");
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { error: "Enter the email address you were invited with." };
  const sb = await supabaseUser();
  if (!sb) return { error: "The CMS is not connected to its database yet." };
  // Same answer whether or not the account exists, so this form cannot be used to discover accounts.
  await sb.auth.resetPasswordForEmail(email, { redirectTo: `${await origin()}/admin/auth/confirm?next=/admin/set-password` });
  return { message: "If that address belongs to a CMS account, a reset link is on its way. It expires after an hour." };
}

export async function setPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 12) return { error: "Use at least 12 characters." };
  if (password.length > 128) return { error: "That password is too long." };
  if (password !== confirm) return { error: "The two passwords do not match." };
  const sb = await supabaseUser();
  if (!sb) return { error: "The CMS is not connected to its database yet." };
  const { data } = await sb.auth.getUser();
  if (!data.user) return { error: "This link has expired. Request a new one from the sign-in page." };
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: error.message.toLowerCase().includes("password") ? "That password was rejected. Try a longer or less common one." : "Could not set the password. Please try again." };
  redirect("/admin");
}
