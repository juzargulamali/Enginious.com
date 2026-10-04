import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/lib/cms/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { variantUrl } from "@/lib/media";
import { MediaUploader } from "@/components/admin/MediaUploader";

export const metadata: Metadata = { title: "Media library" };

const KIND_TABS = [["all", "All"], ["scene", "Scenes"], ["portrait", "Portraits"], ["logo", "Logos"], ["document", "Documents"]] as const;

export default async function Media({ searchParams }: { searchParams: Promise<{ kind?: string; status?: string; q?: string; page?: string }> }) {
  await requireStaffPage();
  const sp = await searchParams;
  const kind = KIND_TABS.some(([k]) => k === sp.kind) ? sp.kind! : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const pageSize = 24;
  const sb = await supabaseUser();
  let q = sb?.from("media_assets").select("id,kind,status,alt,title,storage_path,variants,visibility,published,width,height", { count: "exact" }).order("created_at", { ascending: false });
  if (q && kind !== "all") q = q.eq("kind", kind);
  if (q && sp.status) q = q.eq("status", sp.status);
  const term = (sp.q ?? "").trim().replace(/[%*,()]/g, " ").slice(0, 80);
  if (q && term) q = q.or(`alt.ilike.*${term}*,title.ilike.*${term}*,id.ilike.*${term}*`);
  const res = q ? await q.range((page - 1) * pageSize, page * pageSize - 1) : { data: [], count: 0 };
  const rows = (res.data ?? []) as { id: string; kind: string; status: string; alt: string; title: string | null; storage_path: string; variants: number[] | null; visibility: string; published: boolean; width: number | null; height: number | null }[];
  const count = res.count ?? rows.length;
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const qs = (o: Record<string, string | number | undefined>) => { const p = new URLSearchParams(); const m = { kind: kind === "all" ? undefined : kind, status: sp.status, q: sp.q, ...o } as Record<string, string | number | undefined>; for (const [k, v] of Object.entries(m)) if (v !== undefined && v !== "") p.set(k, String(v)); return p.toString() ? `?${p}` : ""; };
  return (
    <>
      <div className="adm-head">
        <div><p className="adm-crumbs"><Link href="/admin">Dashboard</Link> / Media library</p><h1>Media library</h1><p>Images are checked, resized and re-encoded; originals stay private. Label every image honestly: real, stock, concept or preview.</p></div>
      </div>
      <MediaUploader />
      <div className="adm-tabs" role="navigation" aria-label="Filter by kind" style={{ marginTop: 22 }}>
        {KIND_TABS.map(([k, label]) => <Link key={k} href={`/admin/media${qs({ kind: k === "all" ? undefined : k })}`} aria-current={kind === k ? "page" : undefined}>{label}</Link>)}
      </div>
      <div className="adm-toolbar">
        <form method="get" role="search" aria-label="Search media"><label className="skip" htmlFor="q">Search media</label><input id="q" type="search" name="q" defaultValue={sp.q ?? ""} placeholder="Search description or name" />{kind !== "all" && <input type="hidden" name="kind" value={kind} />}
          <label className="skip" htmlFor="status">Status</label><select id="status" name="status" defaultValue={sp.status ?? ""}><option value="">Any status</option><option value="real">Real</option><option value="stock">Stock</option><option value="concept">Concept</option><option value="preview-portrait">Preview portrait</option><option value="fictional-portrait">Fictional portrait</option></select>
          <button className="adm-btn" type="submit">Apply</button></form>
      </div>
      {rows.length === 0 ? <div className="adm-empty"><h3>{sp.q || sp.status || kind !== "all" ? "No matching media" : "No media uploaded yet"}</h3><p>Upload the first image above. See docs/asset-handoff.md for the files each slot needs.</p></div> : (
        <div className="adm-mgrid">
          {rows.map((m) => (
            <Link key={m.id} className="adm-mcard" href={`/admin/media/${m.id}`}>
              <span className="im" style={m.kind !== "document" && m.visibility === "public" ? { backgroundImage: `url(${variantUrl(m, 480)})` } : undefined}>{m.kind === "document" ? "PDF" : m.visibility === "private" ? "Private" : ""}</span>
              <span className="tx"><b style={{ overflowWrap: "anywhere" }}>{m.title || m.alt || m.id}</b><span className="adm-help">{m.kind}{m.width ? ` · ${m.width}×${m.height}` : ""}</span><span><span className="adm-badge" data-s={m.status === "real" ? "published" : "draft"}>{m.status}</span> {!m.published && <span className="adm-badge" data-s="archived">hidden</span>}</span></span>
            </Link>
          ))}
        </div>
      )}
      {count > pageSize && <div className="adm-pager"><span>{count} files · page {page} of {pages}</span><div>{page > 1 && <Link className="adm-btn adm-btn-sm" href={`/admin/media${qs({ page: page - 1 })}`}>Previous</Link>}{page < pages && <Link className="adm-btn adm-btn-sm" href={`/admin/media${qs({ page: page + 1 })}`}>Next</Link>}</div></div>}
    </>
  );
}
