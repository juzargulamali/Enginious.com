import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/lib/cms/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/cms/format";
import { PurgeTool } from "@/components/admin/PurgeTool";

export const metadata: Metadata = { title: "Enquiries" };

const STATUS_TABS = [["all", "All"], ["new", "New"], ["in_progress", "In progress"], ["closed", "Closed"], ["spam", "Spam"]] as const;
const REGION_LABEL: Record<string, string> = { uae: "Dubai", ksa: "Saudi Arabia", europe: "Europe" };

export default async function Enquiries({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; region?: string; page?: string }> }) {
  const staff = await requireStaffPage();
  const sp = await searchParams;
  const status = STATUS_TABS.some(([k]) => k === sp.status) ? sp.status! : "all";
  const region = ["uae", "ksa", "europe"].includes(sp.region ?? "") ? sp.region : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 25;
  const sb = await supabaseUser();
  const rows: { id: string; reference: string; name: string; company: string | null; email: string; region: string; status: string; created_at: string; notification_status: string; attachment_count: number; project_type: string | null }[] = [];
  let count = 0;
  const counts: Record<string, number> = {};
  if (sb) {
    let q = sb.from("enquiries").select("id,reference,name,company,email,region,status,created_at,notification_status,attachment_count,project_type", { count: "exact" }).order("created_at", { ascending: false });
    if (status !== "all") q = q.eq("status", status);
    if (region) q = q.eq("region", region);
    const term = (sp.q ?? "").trim().replace(/[%*,()]/g, " ").slice(0, 80);
    if (term) q = q.or(`name.ilike.*${term}*,email.ilike.*${term}*,company.ilike.*${term}*,reference.ilike.*${term}*,message.ilike.*${term}*`);
    const from = (page - 1) * pageSize;
    const res = await q.range(from, from + pageSize - 1);
    rows.push(...((res.data ?? []) as typeof rows));
    count = res.count ?? rows.length;
    await Promise.all(STATUS_TABS.filter(([k]) => k !== "all").map(async ([k]) => {
      const c = await sb.from("enquiries").select("id", { count: "exact", head: true }).eq("status", k);
      counts[k] = c.count ?? 0;
    }));
  }
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const qs = (o: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const m = { status: status === "all" ? undefined : status, q: sp.q, region, page: undefined, ...o } as Record<string, string | number | undefined>;
    for (const [k, v] of Object.entries(m)) if (v !== undefined && v !== "") p.set(k, String(v));
    return p.toString() ? `?${p}` : "";
  };

  return (
    <>
      <div className="adm-head">
        <div><p className="adm-crumbs"><Link href="/admin">Dashboard</Link> / Enquiries</p><h1>Enquiries</h1><p>Project enquiries from the website. Only CMS users can see these.</p></div>
      </div>
      <div className="adm-tabs" role="navigation" aria-label="Filter by status">
        {STATUS_TABS.map(([k, label]) => <Link key={k} href={`/admin/enquiries${qs({ status: k === "all" ? undefined : k })}`} aria-current={status === k ? "page" : undefined}>{label}{k !== "all" && counts[k] ? ` (${counts[k]})` : ""}</Link>)}
      </div>
      <div className="adm-toolbar">
        <form method="get" role="search" aria-label="Search enquiries">
          <label className="skip" htmlFor="q">Search enquiries</label>
          <input id="q" type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Name, email, company, reference or text" />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <label className="skip" htmlFor="region">Region</label>
          <select id="region" name="region" defaultValue={region ?? ""}><option value="">All regions</option>{Object.entries(REGION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button className="adm-btn" type="submit">Apply</button>
          {(sp.q || region) && <Link className="adm-btn adm-btn-ghost" href={`/admin/enquiries${qs({ q: undefined, region: undefined })}`}>Clear</Link>}
        </form>
      </div>
      {rows.length === 0 ? (
        <div className="adm-empty"><h3>{sp.q || region || status !== "all" ? "No matching enquiries" : "No enquiries yet"}</h3><p>{sp.q || region || status !== "all" ? "Try clearing the filters." : "When someone sends the contact form, it appears here."}</p></div>
      ) : (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th scope="col">From</th><th scope="col">Region</th><th scope="col">Status</th><th scope="col">Email sent to staff</th><th scope="col">Received</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td data-label="From"><Link className="t" href={`/admin/enquiries/${r.id}`}>{r.name}</Link><span className="sub">{r.company ? `${r.company} · ` : ""}{r.reference}{r.attachment_count ? ` · ${r.attachment_count} file${r.attachment_count === 1 ? "" : "s"}` : ""}</span></td>
                  <td data-label="Region">{REGION_LABEL[r.region] ?? r.region}</td>
                  <td data-label="Status"><span className="adm-badge" data-s={r.status}>{r.status.replace("_", " ")}</span></td>
                  <td data-label="Notification"><span className="adm-badge" data-s={r.notification_status === "sent" ? "sent" : r.notification_status === "failed" ? "failed" : "closed"}>{r.notification_status}</span></td>
                  <td data-label="Received">{timeAgo(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {count > 0 && (
        <div className="adm-pager"><span>{count} enquir{count === 1 ? "y" : "ies"} · page {page} of {pages}</span><div>{page > 1 && <Link className="adm-btn adm-btn-sm" href={`/admin/enquiries${qs({ page: page - 1 })}`}>Previous</Link>}{page < pages && <Link className="adm-btn adm-btn-sm" href={`/admin/enquiries${qs({ page: page + 1 })}`}>Next</Link>}</div></div>
      )}
      {staff.role === "administrator" && (
        <section className="adm-card" style={{ marginTop: 22 }}>
          <h2>Retention</h2>
          <p className="adm-hint" style={{ margin: "6px 0 12px" }}>Enquiries contain personal data. Decide how long to keep them (see docs/privacy-retention.md), then delete closed and spam enquiries, and their attachments, older than a set number of days.</p>
          <PurgeTool />
        </section>
      )}
    </>
  );
}
