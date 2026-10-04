"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteRedirect, saveRedirect } from "@/app/(admin)/admin/actions/redirects";

interface R { id: string; source_path: string; target: string; status_code: number; enabled: boolean; automatic: boolean; note: string | null }
const blank = { id: undefined as string | undefined, source: "", target: "", status: 301, enabled: true, note: "" };

export function RedirectsPanel({ rows }: { rows: R[] }) {
  const router = useRouter();
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    start(async () => {
      const r = await saveRedirect(f);
      if (r.ok) { setF(blank); setMsg({ ok: true, text: "Saved." }); router.refresh(); }
      else { setErrors(r.fieldErrors ?? {}); setMsg({ ok: false, text: r.error }); }
    });
  };
  return (
    <>
      <section className="adm-card" aria-labelledby="rd-h">
        <h2 id="rd-h">{f.id ? "Edit redirect" : "Add a redirect"}</h2>
        <form className="adm-form" style={{ marginTop: 12 }} onSubmit={submit} noValidate>
          <div className="adm-grid-2">
            <div className="adm-field" data-invalid={!!errors.source}><label htmlFor="rd-src">From (path on this site)</label><input id="rd-src" type="text" value={f.source} placeholder="/old-page" onChange={(e) => setF({ ...f, source: e.target.value })} aria-invalid={!!errors.source} />{errors.source && <p className="adm-err">{errors.source}</p>}</div>
            <div className="adm-field" data-invalid={!!errors.target}><label htmlFor="rd-tgt">To (path or https:// address)</label><input id="rd-tgt" type="text" value={f.target} placeholder="/work/whx" onChange={(e) => setF({ ...f, target: e.target.value })} aria-invalid={!!errors.target} />{errors.target && <p className="adm-err">{errors.target}</p>}</div>
          </div>
          <div className="adm-grid-2">
            <div className="adm-field"><label htmlFor="rd-type">Type</label><select id="rd-type" value={f.status} onChange={(e) => setF({ ...f, status: Number(e.target.value) })}><option value={301}>301 Permanent (recommended for moved pages)</option><option value={302}>302 Temporary</option><option value={307}>307 Temporary (keeps method)</option><option value={308}>308 Permanent (keeps method)</option></select></div>
            <div className="adm-field"><label htmlFor="rd-note">Note (internal)</label><input id="rd-note" type="text" value={f.note} maxLength={300} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
          </div>
          <label className="adm-check"><input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} /><span>Enabled</span></label>
          <div className="adm-actions"><button className="adm-btn adm-btn-primary" type="submit" disabled={pending}>{f.id ? "Save redirect" : "Add redirect"}</button>{f.id && <button type="button" className="adm-btn" onClick={() => { setF(blank); setErrors({}); }}>Cancel</button>}</div>
          {msg && <p className={`adm-alert ${msg.ok ? "adm-alert-ok" : "adm-alert-error"}`} role="status">{msg.text}</p>}
        </form>
      </section>
      <div style={{ marginTop: 16 }}>
        {rows.length === 0 ? <div className="adm-empty"><h3>No redirects yet</h3><p>Add one above, or publish a slug change on any page to create one automatically.</p></div> : (
          <div className="adm-tablewrap">
            <table className="adm-table">
              <thead><tr><th scope="col">From</th><th scope="col">To</th><th scope="col">Type</th><th scope="col">State</th><th scope="col" className="num">Actions</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="From"><span className="adm-mono">{r.source_path}</span>{r.automatic && <span className="sub">Created automatically (slug change)</span>}{r.note && <span className="sub">{r.note}</span>}</td>
                    <td data-label="To"><span className="adm-mono" style={{ overflowWrap: "anywhere" }}>{r.target}</span></td>
                    <td data-label="Type">{r.status_code}</td>
                    <td data-label="State"><span className="adm-badge" data-s={r.enabled ? "published" : "archived"}>{r.enabled ? "enabled" : "disabled"}</span></td>
                    <td className="num" data-label="Actions">
                      <button type="button" className="adm-btn adm-btn-sm" onClick={() => { setF({ id: r.id, source: r.source_path, target: r.target, status: r.status_code, enabled: r.enabled, note: r.note ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>{" "}
                      <button type="button" className="adm-btn adm-btn-sm adm-btn-danger" disabled={pending} onClick={() => { if (window.confirm(`Delete the redirect from ${r.source_path}?`)) start(async () => { const x = await deleteRedirect(r.id); if (x.ok) router.refresh(); else setMsg({ ok: false, text: x.error }); }); }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
