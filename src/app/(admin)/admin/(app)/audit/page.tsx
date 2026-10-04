import type { Metadata } from "next";
import Link from "next/link";
import { requireAdministratorPage } from "@/lib/cms/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { dateTime } from "@/lib/cms/format";

export const metadata: Metadata = { title: "Audit log" };

export default async function Audit() {
  await requireAdministratorPage();
  const sb = await supabaseUser();
  const { data } = (await sb?.from("cms_audit").select("id,created_at,actor_email,action,target,detail").order("id", { ascending: false }).limit(200)) ?? { data: [] };
  const rows = (data ?? []) as { id: number; created_at: string; actor_email: string | null; action: string; target: string | null; detail: Record<string, unknown> }[];
  return (
    <>
      <div className="adm-head"><div><p className="adm-crumbs"><Link href="/admin">Dashboard</Link> / Audit log</p><h1>Audit log</h1><p>Access changes, deletions and retention purges. The most recent 200 entries.</p></div></div>
      {rows.length === 0 ? <div className="adm-empty"><h3>Nothing recorded yet</h3></div> : (
        <div className="adm-tablewrap"><table className="adm-table">
          <thead><tr><th scope="col">When</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Target</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}><td data-label="When">{dateTime(r.created_at)}</td><td data-label="Who">{r.actor_email ?? "system"}</td><td data-label="Action"><span className="adm-mono">{r.action}</span></td><td data-label="Target">{r.target ?? ""}{Object.keys(r.detail ?? {}).length ? <span className="sub adm-mono">{JSON.stringify(r.detail)}</span> : null}</td></tr>)}</tbody>
        </table></div>
      )}
    </>
  );
}
