"use client";

import { useId, useMemo, useState } from "react";
import { Markdown } from "@/components/Markdown";
import type { Field } from "@/lib/cms/schema";
import type { FieldProps, MediaOption } from "./types";

const strVal = (v: unknown) => (typeof v === "string" ? v : "");

function Shell({ field, id, error, children, count }: { field: Field; id: string; error?: string; children: React.ReactNode; count?: string }) {
  return (
    <div className="adm-field" data-invalid={!!error} data-field={field.key}>
      <label htmlFor={id}>{field.label}{field.required && <span className="req" title="Required to publish">*</span>}{field.internal && <span className="adm-badge" style={{ marginLeft: 8 }}>internal</span>}</label>
      {children}
      {count && <span className="adm-count">{count}</span>}
      {field.help && <p className="adm-help" id={`${id}-help`}>{field.help}</p>}
      {error && <p className="adm-err" id={`${id}-err`} role="alert">{error}</p>}
    </div>
  );
}

function MediaPicker({ field, value, onChange, media, id, error }: { field: Field; value: string | undefined; onChange: (v: string | undefined) => void; media: MediaOption[]; id: string; error?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wanted = field.mediaKind;
  const options = useMemo(() => media.filter((m) => (wanted === "document" ? m.kind === "document" : wanted === "logo" ? m.kind === "logo" || m.kind === "scene" || m.kind === "portrait" : m.kind !== "document")).filter((m) => !q || (m.alt + m.id + m.title).toLowerCase().includes(q.toLowerCase())), [media, wanted, q]);
  const current = value ? media.find((m) => m.id === value) : undefined;
  return (
    <Shell field={field} id={id} error={error}>
      <div className="adm-media-pick">
        <span className="adm-thumb" style={current?.thumb ? { backgroundImage: `url(${current.thumb})` } : undefined} aria-hidden="true" />
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <span>{value ? (current ? current.alt || current.title || current.id : `${value} (not found in the media library)`) : "Nothing selected"}</span>
          {current && <span className="adm-badge" data-s="draft">{current.status}</span>}
        </div>
        <button type="button" id={id} className="adm-btn adm-btn-sm" aria-label={`${value ? "Change" : "Choose"} ${field.label}`} onClick={() => setOpen(true)}>{value ? "Change" : "Choose"}</button>
        {value && <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => onChange(undefined)}>Clear</button>}
      </div>
      {open && (
        <div className="adm-dialog" role="dialog" aria-modal="true" aria-label={`Choose media for ${field.label}`} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
          <div>
            <div className="adm-head" style={{ marginBottom: 12 }}>
              <h2>Choose media</h2>
              <button type="button" className="adm-btn adm-btn-sm" onClick={() => setOpen(false)}>Close</button>
            </div>
            <input type="search" autoFocus placeholder="Search by description" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search media" />
            {options.length === 0 ? <p className="adm-hint" style={{ margin: "14px 0" }}>No matching media. Upload files in the <a href="/admin/media" target="_blank" rel="noopener">media library</a>, then reopen this picker.</p> : (
              <div className="adm-mgrid" style={{ marginTop: 14 }}>
                {options.map((m) => (
                  <button type="button" key={m.id} className="adm-mcard" style={{ textAlign: "left", cursor: "pointer", color: "inherit", font: "inherit" }} onClick={() => { onChange(m.id); setOpen(false); }}>
                    <span className="im" style={m.thumb ? { backgroundImage: `url(${m.thumb})` } : undefined}>{!m.thumb && (m.kind === "document" ? "PDF" : "No preview")}</span>
                    <span className="tx"><b style={{ overflowWrap: "anywhere" }}>{m.alt || m.title || m.id}</b><span className="adm-help">{m.status} · {m.kind}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Chips({ items, label, onRemove }: { items: { key: string; text: string }[]; label: string; onRemove: (key: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="adm-chips" role="list">
      {items.map((i) => <span role="listitem" className="adm-chip" key={i.key}>{i.text}<button type="button" onClick={() => onRemove(i.key)} aria-label={`Remove ${i.text} from ${label}`}>×</button></span>)}
    </div>
  );
}

export function FieldInput(props: FieldProps) {
  const { field, value, onChange, error, errors, path, media, refs } = props;
  const rid = useId();
  const id = `f-${path.replace(/\./g, "-")}-${rid}`;
  const [draftText, setDraftText] = useState("");
  const [preview, setPreview] = useState(false);
  const describedBy = [field.help ? `${id}-help` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined;

  switch (field.type) {
    case "text": case "email": case "url": case "date": {
      const type = field.type === "text" ? "text" : field.type === "url" ? "url" : field.type;
      return <Shell field={field} id={id} error={error}><input id={id} type={type} value={strVal(value)} maxLength={field.max} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={describedBy} /></Shell>;
    }
    case "number":
      return <Shell field={field} id={id} error={error}><input id={id} type="number" value={typeof value === "number" ? value : ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} aria-invalid={!!error} aria-describedby={describedBy} /></Shell>;
    case "textarea":
      return <Shell field={field} id={id} error={error} count={field.max ? `${strVal(value).length} / ${field.max}` : undefined}><textarea id={id} value={strVal(value)} maxLength={field.max ? field.max + 200 : undefined} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={describedBy} /></Shell>;
    case "markdown":
      return (
        <Shell field={field} id={id} error={error}>
          <div className="adm-actions">
            <button type="button" className="adm-btn adm-btn-sm" aria-pressed={!preview} onClick={() => setPreview(false)}>Write</button>
            <button type="button" className="adm-btn adm-btn-sm" aria-pressed={preview} onClick={() => setPreview(true)}>Preview</button>
            <span className="adm-help">Plain text with ## headings, - lists, **bold**, *italic*, [link](https://...). No HTML.</span>
          </div>
          {preview ? <div className="adm-note md" style={{ minHeight: 120 }}>{strVal(value) ? <Markdown source={strVal(value)} /> : <span className="adm-help">Nothing to preview.</span>}</div>
            : <textarea id={id} className="adm-md" value={strVal(value)} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={describedBy} />}
        </Shell>
      );
    case "boolean":
      return (
        <div className="adm-field" data-invalid={!!error} data-field={field.key}>
          <label className="adm-check" htmlFor={id}><input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} aria-describedby={describedBy} /><span>{field.label}{field.internal && <span className="adm-badge" style={{ marginLeft: 8 }}>internal</span>}</span></label>
          {field.help && <p className="adm-help" id={`${id}-help`}>{field.help}</p>}
          {error && <p className="adm-err" id={`${id}-err`} role="alert">{error}</p>}
        </div>
      );
    case "select":
      return (
        <Shell field={field} id={id} error={error}>
          <select id={id} value={strVal(value)} onChange={(e) => onChange(e.target.value || undefined)} aria-invalid={!!error} aria-describedby={describedBy}>
            <option value="">Not set</option>
            {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Shell>
      );
    case "media":
      return <MediaPicker field={field} value={strVal(value) || undefined} onChange={onChange} media={media} id={id} error={error} />;
    case "mediaList": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      const options = media.filter((m) => m.kind !== "document" && !list.includes(m.id));
      return (
        <Shell field={field} id={id} error={error}>
          <Chips items={list.map((m) => ({ key: m, text: media.find((x) => x.id === m)?.alt || m }))} label={field.label} onRemove={(k) => onChange(list.filter((x) => x !== k))} />
          <div className="adm-add">
            <select id={id} value="" onChange={(e) => { if (e.target.value) onChange([...list, e.target.value]); }} aria-describedby={describedBy}>
              <option value="">{options.length ? "Add media..." : "No more media available"}</option>
              {options.map((m) => <option key={m.id} value={m.id}>{(m.alt || m.title || m.id).slice(0, 70)} ({m.status})</option>)}
            </select>
          </div>
        </Shell>
      );
    }
    case "ref": {
      const opts = (field.refType && refs[field.refType]) || [];
      return (
        <Shell field={field} id={id} error={error}>
          <select id={id} value={strVal(value)} onChange={(e) => onChange(e.target.value || undefined)} aria-describedby={describedBy}>
            <option value="">None</option>
            {strVal(value) && !opts.some((o) => o.slug === value) && <option value={strVal(value)}>{strVal(value)} (not found)</option>}
            {opts.map((o) => <option key={o.slug} value={o.slug}>{o.title}{o.status !== "published" ? ` (${o.status})` : ""}</option>)}
          </select>
        </Shell>
      );
    }
    case "refs": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      const opts = (field.refType && refs[field.refType]) || [];
      const avail = opts.filter((o) => !list.includes(o.slug));
      return (
        <Shell field={field} id={id} error={error}>
          <Chips items={list.map((s) => ({ key: s, text: opts.find((o) => o.slug === s)?.title ?? s }))} label={field.label} onRemove={(k) => onChange(list.filter((x) => x !== k))} />
          <select id={id} value="" onChange={(e) => { if (e.target.value) onChange([...list, e.target.value]); }} aria-describedby={describedBy}>
            <option value="">{avail.length ? "Add..." : opts.length ? "Everything is already added" : "Nothing to link to yet"}</option>
            {avail.map((o) => <option key={o.slug} value={o.slug}>{o.title}{o.status !== "published" ? ` (${o.status})` : ""}</option>)}
          </select>
          {list.some((s) => opts.find((o) => o.slug === s)?.status && opts.find((o) => o.slug === s)?.status !== "published") && <p className="adm-help">Links to unpublished items stay hidden on the public site until those are published.</p>}
        </Shell>
      );
    }
    case "strings": {
      const list = Array.isArray(value) ? (value as string[]) : [];
      const add = () => { const t = draftText.trim(); if (t && !list.includes(t)) { onChange([...list, t]); setDraftText(""); } };
      return (
        <Shell field={field} id={id} error={error}>
          <Chips items={list.map((s) => ({ key: s, text: s }))} label={field.label} onRemove={(k) => onChange(list.filter((x) => x !== k))} />
          <div className="adm-add">
            <input id={id} type="text" value={draftText} maxLength={field.max ?? 200} onChange={(e) => setDraftText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Type and press Enter" aria-describedby={describedBy} />
            <button type="button" className="adm-btn" onClick={add}>Add</button>
          </div>
        </Shell>
      );
    }
    case "records": {
      const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
      const set = (i: number, key: string, v: unknown) => onChange(rows.map((r, n) => (n === i ? { ...r, [key]: v } : r)));
      const move = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= rows.length) return; const c = rows.slice(); [c[i], c[j]] = [c[j], c[i]]; onChange(c); };
      return (
        <Shell field={field} id={id} error={error}>
          <div className="adm-rep" role="group" aria-label={field.label}>
            {rows.map((row, i) => (
              <div className="adm-rep-row" key={i}>
                {(field.fields ?? []).map((sf) => (
                  <FieldInput key={sf.key} field={sf} value={row[sf.key]} onChange={(v) => set(i, sf.key, v)} error={errors[`${path}.${i}.${sf.key}`]} errors={errors} path={`${path}.${i}.${sf.key}`} media={media} refs={refs} />
                ))}
                <div className="row-actions">
                  <button type="button" className="adm-btn adm-btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${field.label} row ${i + 1} up`}>↑</button>
                  <button type="button" className="adm-btn adm-btn-sm" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label={`Move ${field.label} row ${i + 1} down`}>↓</button>
                  <button type="button" className="adm-btn adm-btn-sm adm-btn-danger" onClick={() => onChange(rows.filter((_, n) => n !== i))}>Remove</button>
                </div>
              </div>
            ))}
            <div><button type="button" id={id} className="adm-btn adm-btn-sm" onClick={() => onChange([...rows, {}])}>Add {field.label.toLowerCase().replace(/s$/, "")}</button></div>
          </div>
        </Shell>
      );
    }
    default:
      return null;
  }
}
