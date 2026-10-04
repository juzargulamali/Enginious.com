import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/lib/cms/auth";
import { countsByType, missingContent, recentEdits } from "@/lib/cms/items";
import { CONTENT_TYPES, TYPE_DEFS } from "@/lib/cms/schema";
import { supabaseConfigured, supabaseAdmin, supabaseUser } from "@/lib/supabase/server";
import { indexingAllowed } from "@/lib/seo/indexing";
import { notificationStatus } from "@/lib/notify";
import { timeAgo } from "@/lib/cms/format";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const staff = await requireStaffPage();
  const sp = await searchParams;
  const sb = await supabaseUser();
  const [counts, recent, missing] = await Promise.all([countsByType(), recentEdits(8), missingContent()]);
  const sum = (k: "draft" | "published" | "pending") => Object.values(counts).reduce((a, c) => a + c[k], 0);

  let enq = { new: 0, in_progress: 0, failedNotify: 0 };
  if (sb) {
    const [n, p, f] = await Promise.all([
      sb.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
      sb.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
      sb.from("enquiries").select("id", { count: "exact", head: true }).eq("notification_status", "failed"),
    ]);
    enq = { new: n.count ?? 0, in_progress: p.count ?? 0, failedNotify: f.count ?? 0 };
  }
  const notify = notificationStatus();
  const total = Object.keys(counts).length;

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Dashboard</h1>
          <p>Signed in as {staff.email} ({staff.role === "administrator" ? "administrator" : "editor"}).</p>
        </div>
        <div className="adm-actions">
          <Link className="adm-btn adm-btn-primary" href="/admin/enquiries">Open inbox</Link>
        </div>
      </div>

      {sp.denied && <p className="adm-alert adm-alert-warn" role="alert">That area is for administrators only.</p>}
      {!supabaseConfigured() && <p className="adm-alert adm-alert-error">The CMS is not connected to Supabase (missing environment variables).</p>}
      {supabaseConfigured() && !supabaseAdmin() && <p className="adm-alert adm-alert-warn">SUPABASE_SERVICE_ROLE_KEY is not set: enquiry storage, invitations and attachments are unavailable until it is.</p>}

      <div className="adm-grid" style={{ marginBottom: 20 }}>
        <Link className="adm-stat" href="/admin/enquiries?status=new"><b>{enq.new}</b><span>New enquiries</span><small>{enq.in_progress} in progress</small></Link>
        <div className="adm-stat"><b>{sum("published")}</b><span>Published items</span><small>live on the public site</small></div>
        <div className="adm-stat"><b>{sum("draft")}</b><span>Drafts</span><small>not public</small></div>
        <div className="adm-stat"><b>{sum("pending")}</b><span>Published with unpublished edits</span><small>live version unchanged</small></div>
      </div>

      <div className="adm-grid-2">
        <section className="adm-card" aria-labelledby="missing-h">
          <h2 id="missing-h">Missing content</h2>
          {missing.length === 0 ? <p className="adm-hint" style={{ marginTop: 8 }}>Nothing flagged. Every checked area has content.</p> : (
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 10 }}>
              {missing.map((m) => (
                <li key={m.label}><Link href={m.href} style={{ textDecoration: "none" }}><b>{m.label}</b><span className="adm-help" style={{ display: "block" }}>{m.detail}</span></Link></li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-card" aria-labelledby="recent-h">
          <h2 id="recent-h">Recent edits</h2>
          {recent.length === 0 ? <p className="adm-hint" style={{ marginTop: 8 }}>No content yet. Start with Projects, then use Import to bring in the existing approved content.</p> : (
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 10 }}>
              {recent.map((r) => (
                <li key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <Link href={`/admin/content/${r.type}/${r.id}`} style={{ textDecoration: "none" }}><b>{r.title}</b><span className="adm-help" style={{ display: "block" }}>{TYPE_DEFS[r.type].label}</span></Link>
                  <span style={{ textAlign: "right" }}><span className="adm-badge" data-s={r.status}>{r.status}</span><span className="adm-help" style={{ display: "block" }}>{timeAgo(r.updated_at)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="adm-card" style={{ marginTop: 16 }} aria-labelledby="types-h">
        <h2 id="types-h">Content by type</h2>
        <div className="adm-tablewrap" style={{ marginTop: 12 }}>
          <table className="adm-table">
            <thead><tr><th>Type</th><th className="num">Published</th><th className="num">Draft</th><th className="num">Unpublished edits</th><th className="num">Archived</th></tr></thead>
            <tbody>
              {CONTENT_TYPES.map((t) => {
                const c = counts[t] ?? { total: 0, draft: 0, published: 0, pending: 0, archived: 0 };
                return (
                  <tr key={t}>
                    <td data-label="Type"><Link className="t" href={`/admin/content/${t}`}>{TYPE_DEFS[t].plural}</Link></td>
                    <td className="num" data-label="Published">{c.published}</td><td className="num" data-label="Draft">{c.draft}</td>
                    <td className="num" data-label="Unpublished edits">{c.pending}</td><td className="num" data-label="Archived">{c.archived}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {total === 0 && <p className="adm-hint" style={{ marginTop: 10 }}>Nothing is under CMS control yet, so the public site shows its built-in starter content. Open any type and use Import to bring it across.</p>}
      </section>

      <section className="adm-card" style={{ marginTop: 16 }} aria-labelledby="sys-h">
        <h2 id="sys-h">System status</h2>
        <dl className="adm-kv" style={{ marginTop: 10 }}>
          <dt>Search indexing</dt><dd>{indexingAllowed() ? "Enabled for this deployment" : "Disabled (noindex)"}</dd>
          <dt>Enquiry notifications</dt><dd>{notify.label}{enq.failedNotify ? ` · ${enq.failedNotify} failed` : ""}</dd>
          <dt>Database</dt><dd>{supabaseConfigured() ? "Connected" : "Not connected"}</dd>
        </dl>
      </section>
    </>
  );
}
