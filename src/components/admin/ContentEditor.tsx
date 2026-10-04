"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { archiveItem, checkSlug, deleteItem, publishItem, restoreItem, restoreRevision, saveDraft, unpublishItem } from "@/app/(admin)/admin/actions/content";
import { FieldInput } from "./fields/Fields";
import type { MediaOption, RefMap } from "./fields/types";
import type { Data, Field } from "@/lib/cms/schema";
import { dateTime, timeAgo } from "@/lib/cms/format";

export interface EditorItem {
  id: string; type: string; title: string; slug: string; status: "draft" | "published" | "archived"; version: number; publishedVersion: number | null;
  publishedAt: string | null; updatedAt: string; sortOrder: number; featured: boolean; data: Data;
}
export interface EditorDef { type: string; label: string; titleLabel: string; fields: Field[]; fixedSlugs?: string[]; orderable: boolean; featurable: boolean; publicPath: string | null; slugPrefix: string }
export interface EditorRevision { id: number; kind: "draft" | "published"; version: number; title: string; created_at: string }

interface State { title: string; slug: string; data: Data; sortOrder: number; featured: boolean }
type Save = { s: "saved" | "dirty" | "saving" | "error"; text: string };

const stateOf = (i: EditorItem): State => ({ title: i.title, slug: i.slug, data: i.data, sortOrder: i.sortOrder, featured: i.featured });

export function ContentEditor({ item, def, media, refs, revisions, role }: { item: EditorItem; def: EditorDef; media: MediaOption[]; refs: RefMap; revisions: EditorRevision[]; role: "administrator" | "editor" }) {
  const router = useRouter();
  const [state, setState] = useState<State>(() => stateOf(item));
  const [baseline, setBaseline] = useState(() => JSON.stringify(stateOf(item)));
  const [version, setVersion] = useState(item.version);
  const [status, setStatus] = useState(item.status);
  const [publishedVersion, setPublishedVersion] = useState(item.publishedVersion);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [save, setSave] = useState<Save>({ s: "saved", text: "All changes saved" });
  const [banner, setBanner] = useState<{ kind: "ok" | "error" | "warn"; text: string; reload?: boolean } | null>(null);
  const [slugNote, setSlugNote] = useState("");
  const [pending, start] = useTransition();
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });

  const dirty = useMemo(() => JSON.stringify(state) !== baseline, [state, baseline]);
  const shown: Save = save.s === "saving" ? save : dirty ? (save.s === "error" ? { s: "error", text: "Not saved: fix the problems shown" } : { s: "dirty", text: "Unsaved changes" }) : { s: "saved", text: save.s === "saved" ? save.text : "All changes saved" };

  // Warn before losing unsaved edits: closing/reloading the tab, and following any in-app link.
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (!window.confirm("You have unsaved changes. Leave this page without saving?")) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", onClick, true); };
  }, [dirty]);

  const setData = (key: string, v: unknown) => setState((s) => {
    const data = { ...s.data };
    if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) delete data[key]; else data[key] = v;
    return { ...s, data };
  });

  const doSave = useCallback(async (): Promise<boolean> => {
    const cur = stateRef.current;
    setSave({ s: "saving", text: "Saving..." });
    const r = await saveDraft({ id: item.id, expectedVersion: version, title: cur.title, slug: cur.slug, data: cur.data, sortOrder: cur.sortOrder, featured: cur.featured });
    if (r.ok) {
      setVersion(r.data.version);
      setBaseline(JSON.stringify(cur));
      setErrors({});
      setSave({ s: "saved", text: `Saved ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` });
      setBanner(null);
      return true;
    }
    setErrors(r.fieldErrors ?? {});
    setSave({ s: "error", text: "Not saved" });
    setBanner({ kind: "error", text: r.error, reload: r.code === "conflict" && !r.fieldErrors });
    if (r.fieldErrors) window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-invalid="true"] input, [data-invalid="true"] textarea, [data-invalid="true"] select, [data-invalid="true"] button')?.focus());
    return false;
  }, [item.id, version]);

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); if (stateRef.current && !pending) start(async () => { await doSave(); }); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [doSave, pending]);

  const onSlugBlur = async () => {
    if (def.fixedSlugs || state.slug === item.slug) { setSlugNote(""); return; }
    const r = await checkSlug({ type: item.type, slug: state.slug, exceptId: item.id });
    setSlugNote(r.ok ? (r.available ? "Available." : r.message ?? "Not available.") : "");
  };

  const publish = () => start(async () => {
    if (dirty && !(await doSave())) return;
    const r = await publishItem(item.id);
    if (r.ok) {
      setStatus("published"); setPublishedVersion(r.data.version); setVersion(r.data.version); setErrors({});
      setBanner({ kind: "ok", text: "Published. The public page now shows this version." });
      router.refresh();
    } else {
      setErrors(r.fieldErrors ?? {});
      setBanner({ kind: "error", text: r.error });
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-invalid="true"]')?.scrollIntoView({ block: "center", behavior: "smooth" }));
    }
  });
  const simple = (fn: (id: string) => Promise<{ ok: boolean; error?: string }>, ok: string, confirmText?: string, after?: () => void) => () => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const r = await fn(item.id);
      if (r.ok) { setBanner({ kind: "ok", text: ok }); after?.(); router.refresh(); } else setBanner({ kind: "error", text: r.error ?? "Failed" });
    });
  };
  const unpublish = simple(unpublishItem, "Unpublished. The item is no longer public and is back to a draft.", "Unpublish this item? It disappears from the public site and the sitemap straight away. Your content is kept as a draft.", () => { setStatus("draft"); setPublishedVersion(null); });
  const archive = simple(archiveItem, "Archived.", "Archive this item? It is removed from the public site and hidden from lists. You can restore it later.", () => { setStatus("archived"); setPublishedVersion(null); });
  const restore = simple(restoreItem, "Restored as a draft.", undefined, () => setStatus("draft"));
  const remove = () => {
    if (!window.confirm("Permanently delete this item and its history? This cannot be undone.")) return;
    start(async () => { const r = await deleteItem(item.id); if (r.ok) router.push(`/admin/content/${item.type}`); else setBanner({ kind: "error", text: r.error }); });
  };
  const restoreRev = (id: number) => {
    if (dirty && !window.confirm("Restoring replaces your unsaved edits with that version. Continue?")) return;
    if (!window.confirm("Restore this version as the current draft? The live page does not change until you publish.")) return;
    start(async () => { const r = await restoreRevision(item.id, id); if (r.ok) { setBanner({ kind: "ok", text: "Restored as a new draft version." }); window.location.reload(); } else setBanner({ kind: "error", text: r.error }); });
  };

  const groups = useMemo(() => {
    const out: { name: string; fields: Field[] }[] = [];
    for (const f of def.fields) { const g = f.group ?? "Details"; let grp = out.find((x) => x.name === g); if (!grp) { grp = { name: g, fields: [] }; out.push(grp); } grp.fields.push(f); }
    return out;
  }, [def.fields]);

  const live = status === "published";
  const pendingEdits = live && publishedVersion !== version;
  const errorCount = Object.keys(errors).length;

  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumbs"><Link href="/admin">Dashboard</Link> / <Link href={`/admin/content/${item.type}`}>{def.label}</Link> / {state.title || "Untitled"}</p>
          <h1>{state.title || "Untitled"}</h1>
          <p><span className="adm-badge" data-s={status}>{status}</span> {pendingEdits && <span className="adm-badge" data-s="pending">unpublished edits</span>}</p>
        </div>
        <div className="adm-actions">
          {def.publicPath && live && <a className="adm-btn" href={def.publicPath} target="_blank" rel="noopener">View live page</a>}
          <a className="adm-btn" href={`/admin/content/${item.type}/${item.id}/preview`} target="_blank" rel="noopener">Preview draft</a>
        </div>
      </div>

      <div aria-live="polite">
        {banner && <p className={`adm-alert adm-alert-${banner.kind === "ok" ? "ok" : banner.kind === "warn" ? "warn" : "error"}`} role={banner.kind === "error" ? "alert" : "status"} style={{ marginBottom: 14 }}>{banner.text} {banner.reload && <button type="button" className="adm-btn adm-btn-sm" onClick={() => window.location.reload()}>Reload</button>}</p>}
        {errorCount > 0 && !banner && <p className="adm-alert adm-alert-error" role="alert" style={{ marginBottom: 14 }}>{errorCount} field{errorCount === 1 ? "" : "s"} need attention.</p>}
      </div>

      <div className="adm-editor">
        <form onSubmit={(e) => { e.preventDefault(); start(async () => { await doSave(); }); }} noValidate>
          <fieldset className="adm-fieldset">
            <legend>Title and address</legend>
            <div className="adm-field" data-invalid={!!errors.title}>
              <label htmlFor="ed-title">{def.titleLabel}<span className="req">*</span></label>
              <input id="ed-title" type="text" value={state.title} maxLength={200} onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))} aria-invalid={!!errors.title} aria-describedby={errors.title ? "ed-title-err" : undefined} />
              {errors.title && <p className="adm-err" id="ed-title-err" role="alert">{errors.title}</p>}
            </div>
            <div className="adm-field" data-invalid={!!errors.slug}>
              <label htmlFor="ed-slug">Slug</label>
              {def.fixedSlugs ? <input id="ed-slug" type="text" value={state.slug} readOnly aria-readonly="true" /> : (
                <input id="ed-slug" type="text" value={state.slug} maxLength={80} onChange={(e) => { setSlugNote(""); setState((s) => ({ ...s, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })); }} onBlur={onSlugBlur} aria-invalid={!!errors.slug} aria-describedby="ed-slug-help" />
              )}
              <p className="adm-help" id="ed-slug-help">{def.publicPath ? <>Public address: <span className="adm-mono">{def.slugPrefix}{state.slug || "..."}</span></> : "Used internally to identify this item."}{def.fixedSlugs ? " This slug is fixed." : ""}</p>
              {live && state.slug !== item.slug && !def.fixedSlugs && <p className="adm-alert adm-alert-warn">Changing the slug of a published page changes its web address. When you publish, the old address redirects to the new one automatically.</p>}
              {slugNote && <p className={slugNote === "Available." ? "adm-help" : "adm-err"} role="status">{slugNote}</p>}
              {errors.slug && <p className="adm-err" role="alert">{errors.slug}</p>}
            </div>
          </fieldset>

          {groups.map((g) => (
            <fieldset className="adm-fieldset" key={g.name}>
              <legend>{g.name}</legend>
              {g.fields.map((f) => (
                <FieldInput key={f.key} field={f} value={state.data[f.key]} onChange={(v) => setData(f.key, v)} error={errors[f.key]} errors={errors} path={f.key} media={media} refs={refs} />
              ))}
            </fieldset>
          ))}

          <div className="adm-savebar" role="region" aria-label="Save">
            <span className="status" data-s={shown.s} role="status">{shown.text}</span>
            <button type="submit" className="adm-btn" disabled={pending || !dirty}>Save draft</button>
            <button type="button" className="adm-btn adm-btn-primary" onClick={publish} disabled={pending || status === "archived" || (!dirty && live && !pendingEdits)}>{live ? (pendingEdits || dirty ? "Save and update live page" : "Published") : "Save and publish"}</button>
          </div>
        </form>

        <aside className="adm-sidepanel" aria-label="Workflow and history">
          <section className="adm-card">
            <h2>Status</h2>
            <dl className="adm-kv" style={{ marginTop: 10 }}>
              <dt>State</dt><dd>{status}</dd>
              <dt>Draft version</dt><dd>{version}</dd>
              <dt>Live version</dt><dd>{live && publishedVersion ? publishedVersion : "none"}</dd>
              <dt>Published</dt><dd>{item.publishedAt ? dateTime(item.publishedAt) : "never"}</dd>
              <dt>Last edited</dt><dd>{timeAgo(item.updatedAt)}</dd>
            </dl>
            <div className="adm-actions" style={{ marginTop: 14 }}>
              {live && <button type="button" className="adm-btn" onClick={unpublish} disabled={pending}>Unpublish</button>}
              {status !== "archived" ? <button type="button" className="adm-btn" onClick={archive} disabled={pending}>Archive</button> : <button type="button" className="adm-btn" onClick={restore} disabled={pending}>Restore</button>}
              {status === "archived" && role === "administrator" && <button type="button" className="adm-btn adm-btn-danger" onClick={remove} disabled={pending}>Delete permanently</button>}
            </div>
          </section>

          {(def.orderable || def.featurable) && (
            <section className="adm-card">
              <h2>Order and featuring</h2>
              <div className="adm-form" style={{ marginTop: 10 }}>
                {def.orderable && (
                  <div className="adm-field">
                    <label htmlFor="ed-order">Display order</label>
                    <input id="ed-order" type="number" value={state.sortOrder} onChange={(e) => setState((s) => ({ ...s, sortOrder: Number(e.target.value) || 0 }))} />
                    <p className="adm-help">Lower numbers come first. You can also reorder from the list.</p>
                  </div>
                )}
                {def.featurable && <label className="adm-check"><input type="checkbox" checked={state.featured} onChange={(e) => setState((s) => ({ ...s, featured: e.target.checked }))} /><span>Featured</span></label>}
                <p className="adm-help">Order and featured status go live when you publish, or use Apply order on the list page.</p>
              </div>
            </section>
          )}

          <section className="adm-card">
            <h2>History</h2>
            {revisions.length === 0 ? <p className="adm-hint" style={{ marginTop: 8 }}>No history yet.</p> : (
              <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 8 }}>
                {revisions.slice(0, 12).map((r) => (
                  <li key={r.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                    <span><span className="adm-badge" data-s={r.kind === "published" ? "published" : "draft"}>{r.kind === "published" ? "published" : "draft"} v{r.version}</span><span className="adm-help" style={{ display: "block" }}>{timeAgo(r.created_at)}</span></span>
                    <button type="button" className="adm-btn adm-btn-sm" onClick={() => restoreRev(r.id)} disabled={pending}>Restore</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
