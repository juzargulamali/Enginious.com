import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/lib/cms/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { RedirectsPanel } from "@/components/admin/RedirectsPanel";

export const metadata: Metadata = { title: "Redirects" };

export default async function Redirects({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaffPage();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 25;
  const sb = await supabaseUser();
  let q = sb?.from("redirects").select("id,source_path,target,status_code,enabled,automatic,note", { count: "exact" }).order("created_at", { ascending: false });
  const term = (sp.q ?? "").trim().replace(/[%*,()]/g, " ").slice(0, 80);
  if (q && term) q = q.or(`source_path.ilike.*${term}*,target.ilike.*${term}*`);
  const res = q ? await q.range((page - 1) * pageSize, page * pageSize - 1) : { data: [], count: 0 };
  const rows = (res.data ?? []) as never[];
  const count = res.count ?? rows.length;
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumbs"><Link href="/admin">Dashboard</Link> / Redirects</p>
          <h1>Redirects</h1>
          <p>Send old addresses to new ones. Changing the slug of a published page adds a redirect automatically. Loops and unsafe external targets are refused.</p>
        </div>
      </div>
      <div className="adm-toolbar">
        <form method="get" role="search" aria-label="Search redirects"><label className="skip" htmlFor="q">Search</label><input id="q" type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Search addresses" /><button className="adm-btn" type="submit">Search</button></form>
      </div>
      <RedirectsPanel rows={rows} />
      {count > pageSize && (
        <div className="adm-pager"><span>{count} redirects · page {page} of {pages}</span><div>{page > 1 && <Link className="adm-btn adm-btn-sm" href={`/admin/redirects?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(page - 1) })}`}>Previous</Link>}{page < pages && <Link className="adm-btn adm-btn-sm" href={`/admin/redirects?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(page + 1) })}`}>Next</Link>}</div></div>
      )}
    </>
  );
}
