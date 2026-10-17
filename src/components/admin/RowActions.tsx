"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteItem, moveItem, setFeatured } from "@/app/(admin)/admin/actions/content";

export function RowActions({ id, title, canDelete, canMove, featurable, featured, first, last }: { id: string; title: string; canDelete: boolean; canMove: boolean; featurable: boolean; featured: boolean; first: boolean; last: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => start(async () => { const r = await fn(); if (!r.ok) setErr(r.error ?? "Failed"); else { setErr(""); router.refresh(); } });
  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
      {canMove && (
        <>
          <button type="button" className="adm-btn adm-btn-sm" disabled={pending || first} aria-label="Move up" onClick={() => run(() => moveItem(id, "up"))}>↑</button>
          <button type="button" className="adm-btn adm-btn-sm" disabled={pending || last} aria-label="Move down" onClick={() => run(() => moveItem(id, "down"))}>↓</button>
        </>
      )}
      {featurable && (
        <button type="button" className="adm-btn adm-btn-sm" disabled={pending} aria-pressed={featured} onClick={() => run(() => setFeatured(id, !featured))}>
          {featured ? "★ Featured" : "☆ Feature"}
        </button>
      )}
      {canDelete && (
        <button type="button" className="adm-btn adm-btn-sm adm-btn-danger" disabled={pending} aria-label={`Delete ${title}`}
          onClick={() => { if (window.confirm(`Permanently delete "${title}" and its history? If it is live it disappears from the public site immediately. This cannot be undone.`)) run(() => deleteItem(id)); }}>Delete</button>
      )}
      {err && <span className="adm-err" role="alert">{err}</span>}
    </span>
  );
}
