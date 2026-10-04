import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/cms/auth";
import { listItems, type Status } from "@/lib/cms/items";
import { typeDef } from "@/lib/cms/schema";
import { timeAgo } from "@/lib/cms/format";
import { RowActions } from "@/components/admin/RowActions";
import { ListTools } from "@/components/admin/ListTools";
import { canImport } from "@/lib/content/seed";
import { supabaseUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Content" };

const STATUSES = [["all", "All"], ["published", "Published"], ["draft", "Drafts"], ["pending", "Unpublished edits"], ["archived", "Archived"]] as const;

export default async function ContentList({ params, searchParams }: { params: Promise<{ type: string }>; searchParams: Promise<{ q?: string; status?: string; page?: string; sort?: string }> }) {
  const staff = await requireStaffPage();
  const { type } = await params;
  const def = typeDef(type);
  if (!def) notFound();
  const sp = await searchParams;
  const status = (STATUSES.some(([k]) => k === sp.status) ? sp.status : "all") as Status | "all" | "pending";
  const sort = (sp.sort === "title" || sp.sort === "order" ? sp.sort : def.orderable ? "order" : "updated") as "updated" | "title" | "order";
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 20;
  const { rows, count, error } = await listItems({ type: def.type, status, q: sp.q, page, pageSize, sort });
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: sp.q, status: status === "all" ? undefined : status, sort: sp.sort, page: undefined, ...over } as Record<string, string | number | undefined>;
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") p.set(k, String(v));
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  let adopted = !canImport(def.type);
  let pendingImported = 0;
  if (canImport(def.type)) {
    const sb = await supabaseUser();
    if (sb) {
      const [a, n] = await Promise.all([
        sb.from("cms_type_adoption").select("type").eq("type", def.type).limit(1),
        sb.from("content_items").select("id", { count: "exact", head: true }).eq("type", def.type).eq("status", "draft").not("imported_at", "is", null),
      ]);
      adopted = (a.data ?? []).length > 0;
      pendingImported = n.count ?? 0;
    }
  }
  const base = `/admin/content/${def.type}`;
  const fixedLeft = def.fixedSlugs ? def.fixedSlugs.length - rows.length : 1;

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumbs"><Link href="/admin">Dashboard</Link> / {def.plural}</p>
          <h1>{def.plural}</h1>
          <p>{def.description}</p>
        </div>
        <div className="adm-actions">
          <ListTools type={def.type} orderable={def.orderable} canImport={canImport(def.type)} isAdmin={staff.role === "administrator"} adopted={adopted} pendingImported={pendingImported} />
          {fixedLeft > 0 && <Link className="adm-btn adm-btn-primary" href={`${base}/new`}>New {def.label.toLowerCase()}</Link>}
        </div>
      </div>

      {canImport(def.type) && !adopted && (
        <p className="adm-alert" role="status">The live site still shows the built-in starter content for {def.plural.toLowerCase()}. Items here are drafts until an administrator reviews and publishes the imported content.</p>
      )}
      <div className="adm-tabs" role="navigation" aria-label="Filter by status">
        {STATUSES.map(([k, label]) => <Link key={k} href={`${base}${qs({ status: k === "all" ? undefined : k })}`} aria-current={status === k ? "page" : undefined}>{label}</Link>)}
      </div>
      <div className="adm-toolbar">
        <form method="get" role="search" aria-label={`Search ${def.plural}`}>
          <label className="skip" htmlFor="q">Search</label>
          <input id="q" type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Search title or slug" />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <label className="skip" htmlFor="sort">Sort</label>
          <select id="sort" name="sort" defaultValue={sort}>
            {def.orderable && <option value="order">Display order</option>}
            <option value="updated">Recently edited</option>
            <option value="title">Title A to Z</option>
          </select>
          <button className="adm-btn" type="submit">Apply</button>
          {(sp.q || sp.sort) && <Link className="adm-btn adm-btn-ghost" href={`${base}${qs({ q: undefined, sort: undefined })}`}>Clear</Link>}
        </form>
      </div>

      {error && <p className="adm-alert adm-alert-error" role="alert">Could not load this list. Please reload.</p>}
      {!error && rows.length === 0 ? (
        <div className="adm-empty">
          <h3>{sp.q ? "No matches" : `No ${def.plural.toLowerCase()} here yet`}</h3>
          <p>{sp.q ? "Try a different search or clear the filters." : status !== "all" ? "Nothing has this status." : `Create the first ${def.label.toLowerCase()}${canImport(def.type) ? ", or import the existing starter content" : ""}.`}</p>
          {!sp.q && fixedLeft > 0 && <p style={{ marginTop: 14 }}><Link className="adm-btn adm-btn-primary" href={`${base}/new`}>New {def.label.toLowerCase()}</Link></p>}
        </div>
      ) : (
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">{def.titleLabel.replace(/ \(internal\)/, "")}</th><th scope="col">Status</th>
                {(def.listKeys ?? []).map((k) => <th key={k} scope="col">{def.fields.find((f) => f.key === k)?.label ?? k}</th>)}
                <th scope="col">Edited</th><th scope="col" className="num">Order and featured</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const pending = r.status === "published" && r.published_version !== r.version;
                return (
                  <tr key={r.id}>
                    <td data-label="Title"><Link className="t" href={`${base}/${r.id}`}>{r.title}</Link><span className="sub adm-mono">{def.path ? def.path(r.slug) : r.slug}</span></td>
                    <td data-label="Status"><span className="adm-badge" data-s={r.status}>{r.status}</span>{pending && <> <span className="adm-badge" data-s="pending">unpublished edits</span></>}</td>
                    {(def.listKeys ?? []).map((k) => <td key={k} data-label={k}>{String(r.draft[k] ?? "") || <span className="muted">-</span>}</td>)}
                    <td data-label="Edited">{timeAgo(r.updated_at)}</td>
                    <td className="num" data-label="Order"><RowActions id={r.id} canMove={def.orderable && sort === "order" && !sp.q && status === "all"} featurable={def.featurable} featured={r.featured} first={i === 0 && page === 1} last={i === rows.length - 1 && page === pages} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {count > 0 && (
        <div className="adm-pager">
          <span>{count} item{count === 1 ? "" : "s"} · page {page} of {pages}</span>
          <div>
            {page > 1 && <Link className="adm-btn adm-btn-sm" href={`${base}${qs({ page: page - 1 })}`}>Previous</Link>}
            {page < pages && <Link className="adm-btn adm-btn-sm" href={`${base}${qs({ page: page + 1 })}`}>Next</Link>}
          </div>
        </div>
      )}
    </>
  );
}
