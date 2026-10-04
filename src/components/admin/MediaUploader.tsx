"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatBytes } from "@/lib/upload";

const STATUS_HELP: Record<string, string> = {
  real: "A genuine photograph or file supplied by Enginious or the person shown.",
  stock: "Licensed stock. Shown with an 'Illustrative image' label.",
  concept: "An illustrative concept, not a photograph of an Enginious project. Labelled 'Illustrative image'.",
  "preview-portrait": "A stand-in portrait, not an employee. Labelled 'Preview'.",
  "fictional-portrait": "A generated or fictional person, not real. Labelled 'Preview'.",
};

export function MediaUploader() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState("scene");
  const [status, setStatus] = useState("concept");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const isDoc = kind === "document";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) { setMsg({ ok: false, text: "Choose a file first." }); return; }
    const fd = new FormData(e.currentTarget);
    fd.set("file", file);
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.id) { setMsg({ ok: true, text: "Uploaded." }); setFile(null); (e.target as HTMLFormElement).reset(); if (input.current) input.current.value = ""; router.push(`/admin/media/${data.id}`); router.refresh(); }
      else setMsg({ ok: false, text: data.error ?? (res.status === 413 ? "That file is too large (4 MB limit)." : "The upload failed.") });
    } catch { setMsg({ ok: false, text: "Network problem. The file was not uploaded." }); }
    finally { setBusy(false); }
  }

  return (
    <section className="adm-card" aria-labelledby="up-h">
      <h2 id="up-h">Upload</h2>
      <p className="adm-hint" style={{ margin: "6px 0 14px" }}>JPEG, PNG or WebP images (up to 4 MB, about 2400 px wide is plenty) and PDF documents. SVG and other formats are refused.</p>
      <form className="adm-form" onSubmit={submit} noValidate>
        <div className="adm-grid-2">
          <div className="adm-field"><label htmlFor="up-file">File<span className="req">*</span></label><input ref={input} id="up-file" type="file" accept={isDoc ? "application/pdf" : "image/jpeg,image/png,image/webp"} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />{file && <p className="adm-help">{file.name} · {formatBytes(file.size)}</p>}</div>
          <div className="adm-field"><label htmlFor="up-kind">What is it?</label><select id="up-kind" name="kind" value={kind} onChange={(e) => { setKind(e.target.value); if (e.target.value === "document") setStatus("real"); }}><option value="scene">Image: scene, project or environment</option><option value="portrait">Image: portrait of a person</option><option value="logo">Image: logo</option><option value="document">Document (PDF)</option></select></div>
        </div>
        <div className="adm-grid-2">
          <div className="adm-field"><label htmlFor="up-status">Status (be honest)</label><select id="up-status" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>{Object.keys(STATUS_HELP).map((s) => <option key={s} value={s}>{s}</option>)}</select><p className="adm-help">{STATUS_HELP[status]}</p></div>
          <div className="adm-field"><label htmlFor="up-vis">Visibility</label><select id="up-vis" name="visibility" defaultValue="public"><option value="public">Public (can be used on pages)</option><option value="private">Private (staff only, never public)</option></select></div>
        </div>
        <div className="adm-field"><label htmlFor="up-alt">{isDoc ? "Description" : "Alt text"}{!isDoc && <span className="req">*</span>}</label><input id="up-alt" name="alt" type="text" maxLength={300} placeholder={isDoc ? "Company profile 2026" : "Describe what the image shows, for people who cannot see it"} /></div>
        {!isDoc && (
          <div className="adm-grid-2">
            <div className="adm-field"><label htmlFor="up-credit">Credit</label><input id="up-credit" name="credit" type="text" maxLength={200} /></div>
            <div className="adm-field"><label htmlFor="up-licence">Licence</label><input id="up-licence" name="licence" type="text" maxLength={200} placeholder="Supplied by Enginious; Unsplash License..." /></div>
            <div className="adm-field"><label htmlFor="up-source">Source address</label><input id="up-source" name="source_url" type="url" maxLength={500} placeholder="https://..." /></div>
            <div className="adm-field"><label htmlFor="up-caption">Caption</label><input id="up-caption" name="caption" type="text" maxLength={400} /></div>
          </div>
        )}
        <div className="adm-actions"><button className="adm-btn adm-btn-primary" type="submit" disabled={busy || !file}>{busy ? "Uploading..." : "Upload"}</button></div>
        <div aria-live="polite">{msg && <p className={`adm-alert ${msg.ok ? "adm-alert-ok" : "adm-alert-error"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>}</div>
      </form>
    </section>
  );
}
