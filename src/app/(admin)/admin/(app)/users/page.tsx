import type { Metadata } from "next";
import Link from "next/link";
import { requireAdministratorPage } from "@/lib/cms/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { UsersPanel } from "@/components/admin/UsersPanel";

export const metadata: Metadata = { title: "Users and access" };

export default async function Users() {
  const me = await requireAdministratorPage();
  const sb = await supabaseUser();
  const { data } = (await sb?.from("cms_roles").select("user_id,role,email,disabled,created_at").order("created_at", { ascending: true })) ?? { data: [] };
  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumbs"><Link href="/admin">Dashboard</Link> / Users and access</p>
          <h1>Users and access</h1>
          <p>Access is by invitation only. Administrators manage access and settings; editors manage content and enquiries. Nobody can give themselves a role.</p>
        </div>
      </div>
      <UsersPanel meId={me.id} users={(data ?? []) as never} />
    </>
  );
}
