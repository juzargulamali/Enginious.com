import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/cms/auth";
import { supabaseConfigured } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getStaff()) redirect("/admin");
  const safe = next && next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
  return (
    <>
      <h1>Sign in</h1>
      <p className="adm-hint">Access is by invitation only.</p>
      {!supabaseConfigured() && <p className="adm-alert adm-alert-warn">The CMS is not connected to Supabase yet (missing environment variables). See docs/HANDOVER.md.</p>}
      <LoginForm next={safe} />
    </>
  );
}
