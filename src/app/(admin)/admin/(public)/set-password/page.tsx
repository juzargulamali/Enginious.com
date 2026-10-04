import type { Metadata } from "next";
import Link from "next/link";
import { supabaseUser } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";

export const metadata: Metadata = { title: "Choose a password" };
export const dynamic = "force-dynamic";

export default async function SetPassword() {
  const sb = await supabaseUser();
  const { data } = sb ? await sb.auth.getUser() : { data: { user: null } };
  if (!data.user) {
    return (
      <>
        <h1>Link expired</h1>
        <p className="adm-hint">This link is invalid or has expired. Request a new one from the sign-in page.</p>
        <p><Link className="adm-btn" href="/admin/forgot-password">Request a new link</Link></p>
      </>
    );
  }
  return (
    <>
      <h1>Choose a password</h1>
      <p className="adm-hint">Signed in as {data.user.email}. Use at least 12 characters.</p>
      <SetPasswordForm />
    </>
  );
}
