"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteMedia, updateMedia } from "@/app/(admin)/admin/actions/media";
import { formatBytes } from "@/lib/upload";

interface M { id: string; kind: string; status: string; published: boolean; alt: string; title: string | null; caption: string | null; credit: string | null; source_url: string | null; licence: string | null; focal_x: number; focal_y: number; width: number | null; height: number | null; bytes: number | null; visibility: string; mime: string | null; original_name: string | null; created_at: string }
interface Use { item_id: string; type: string; slug: string; title: string; in_published: boolean }

export function MediaEditor({ media, preview, docUrl, usage }: { media: M; preview: string | null; docUrl: string | null; usage: Use[] }) {
  const router = useRouter();
  const [f, setF] = useState({ alt: media.alt, title: media.title ?? "", caption: media.caption ?? "", credit: media.credit ?? "", sourceUrl: media.source_url ?? "", licence: media.licence ?? "", status: media.status, published: media.published, focalX: Number(media.focal_x), focalY: Number(media.focal_y) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const img = useRef<HTMLDivElement>(null);
  const set = (patch: Partial<typeof f>) => { setF((s) => ({ ...s, ...patch })); setDirty(true); };
  const isDoc = media.kind === "document";

  const save = () => start(async () => {
    const r = await updateMedia(media.id, f);
    if (r.ok) { setMsg({ ok: true, text: "Saved." }); setErrors({}); setDirty(false); router.refresh(); } else { setErrors(r.fieldErrors ?? {}); setMsg({ ok: false, text: r.error }); }
  });
  const remove = () => {
    if (!window.confirm("Delete this media and its files permanently?")) return;
    start(async () => { const r = await deleteMedia(media.id); if (r.ok) router.push("/admin/media"); else setMsg({ ok: false, text: r.error }); });
  };
  const pick = (e: React.MouseEvent) => {
    const r = img.current?.getBoundingClientRect(); if (!r) return;
    set({ focalX: Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 100) / 100, focalY: Math.round(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) * 100) / 100 });
  };
  const referencedPublished = usage.some((u) => u.in_published);

  return (
    <div className="adm-editor">
      <div>
        <section className="adm-card">
          {isDoc ? (
            <p>{docUrl ? <a className="adm-btn" href={docUrl} target="_blank" rel="noopener">Open PDF</a> : <span className="adm-hint">Private document: not publicly available.</span>}</p>
          ) : preview ? (
            <>
              <div ref={img} onClick={pick} role="presentation" style={{ position: "relative", cursor: "crosshair", borderRadius: 12, overflow: "hidden", lineHeight: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt={f.alt || "Uploaded image"} style={{ width: "100%", height: "auto", display: "block" }} />
                <span aria-hidden="true" style={{ position: "absolute", left: `${f.focalX * 100}%`, top: `${f.focalY * 100}%`, width: 26, height: 26, margin: "-13px 0 0 -13px", borderRadius: "50%", border: "2px solid #27cdd8", boxShadow: "0 0 0 2px rgba(0,0,0,.6), 0 0 14px #27cdd8", background: "rgba(39,205,216,.25)" }} />
              </div>
              <p className="adm-help" style={{ marginTop: 8 }}>Click the image to set the focal point (the part that must stay visible when it is cropped). Now: {Math.round(f.focalX * 100)}% across, {Math.round(f.focalY * 100)}% down.</p>
            </>
          ) : <p className="adm-hint">No preview available.</p>}
        </section>

        <section className="adm-card">
          <h2>Details</h2>
          <form className="adm-form" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
            <div className="adm-field" data-invalid={!!errors.alt}><label htmlFor="m-alt">{isDoc ? "Description" : "Alt text"}{!isDoc && <span className="req">*</span>}</label><textarea id="m-alt" value={f.alt} maxLength={300} onChange={(e) => set({ alt: e.target.value })} aria-invalid={!!errors.alt} />{errors.alt && <p className="adm-err">{errors.alt}</p>}</div>
            <div className="adm-field"><label htmlFor="m-title">Name (for finding it in the library)</label><input id="m-title" type="text" value={f.title} maxLength={200} onChange={(e) => set({ title: e.target.value })} /></div>
            {!isDoc && <div className="adm-field"><label htmlFor="m-cap">Caption</label><input id="m-cap" type="text" value={f.caption} maxLength={400} onChange={(e) => set({ caption: e.target.value })} /></div>}
            <div className="adm-grid-2">
              <div className="adm-field"><label htmlFor="m-credit">Credit</label><input id="m-credit" type="text" value={f.credit} maxLength={200} onChange={(e) => set({ credit: e.target.value })} /></div>
              <div className="adm-field"><label htmlFor="m-licence">Licence</label><input id="m-licence" type="text" value={f.licence} maxLength={200} onChange={(e) => set({ licence: e.target.value })} /></div>
            </div>
            <div className="adm-field" data-invalid={!!errors.sourceUrl}><label htmlFor="m-src">Source address</label><input id="m-src" type="url" value={f.sourceUrl} onChange={(e) => set({ sourceUrl: e.target.value })} aria-invalid={!!errors.sourceUrl} />{errors.sourceUrl && <p className="adm-err">{errors.sourceUrl}</p>}</div>
            <div className="adm-field" data-invalid={!!errors.status}><label htmlFor="m-status">Status</label><select id="m-status" value={f.status} onChange={(e) => set({ status: e.target.value })}>{["real", "stock", "concept", "preview-portrait", "fictional-portrait"].map((s) => <option key={s} value={s}>{s}</option>)}</select><p className="adm-help">Only mark an image <b>real</b> if it genuinely is. Concepts and previews are labelled on the public site.</p></div>
            <label className="adm-check"><input type="checkbox" checked={f.published} onChange={(e) => set({ published: e.target.checked })} /><span>Available to public pages</span></label>
            <div className="adm-actions"><button className="adm-btn adm-btn-primary" type="submit" disabled={pending || !dirty}>Save changes</button><span className="adm-help" role="status">{dirty ? "Unsaved changes" : ""}</span></div>
            {msg && <p className={`adm-alert ${msg.ok ? "adm-alert-ok" : "adm-alert-error"}`} role="status">{msg.text}</p>}
          </form>
        </section>
      </div>

      <aside className="adm-sidepanel" aria-label="File information">
        <section className="adm-card">
          <h2>File</h2>
          <dl className="adm-kv" style={{ marginTop: 10 }}>
            <dt>Kind</dt><dd>{media.kind}</dd>
            {media.width && <><dt>Size</dt><dd>{media.width} × {media.height}</dd></>}
            {media.bytes != null && <><dt>Stored size</dt><dd>{formatBytes(media.bytes)}</dd></>}
            <dt>Visibility</dt><dd>{media.visibility}</dd>
            {media.original_name && <><dt>Original name</dt><dd>{media.original_name}</dd></>}
          </dl>
        </section>
        <section className="adm-card">
          <h2>Where it is used</h2>
          {usage.length === 0 ? <p className="adm-hint" style={{ marginTop: 8 }}>Not used by any content.</p> : (
            <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 8 }}>
              {usage.map((u) => <li key={u.item_id}><Link href={`/admin/content/${u.type}/${u.item_id}`}>{u.title}</Link> <span className="adm-badge" data-s={u.in_published ? "published" : "draft"}>{u.in_published ? "live" : "draft only"}</span></li>)}
            </ul>
          )}
          <div style={{ marginTop: 14 }}>
            <button type="button" className="adm-btn adm-btn-danger" onClick={remove} disabled={pending || usage.length > 0}>Delete media</button>
            {usage.length > 0 && <p className="adm-help" style={{ marginTop: 6 }}>{referencedPublished ? "This media is live on the site and cannot be deleted." : "Remove it from the drafts that use it before deleting."}</p>}
          </div>
        </section>
      </aside>
    </div>
  );
}
