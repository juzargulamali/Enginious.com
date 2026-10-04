"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { applyOrder } from "@/app/(admin)/admin/actions/content";
import { importStarterContent } from "@/app/(admin)/admin/actions/import";

export function ListTools({ type, orderable, canImport, isAdmin }: { type: string; orderable: boolean; canImport: boolean; isAdmin: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  void isAdmin;
  const importNow = () => {
    if (!window.confirm("Bring the built-in starter content for this type under CMS control?\n\nIt creates and publishes any items that do not exist yet. The public site will look the same. Existing CMS items are not changed.")) return;
    start(async () => {
      const r = await importStarterContent(type);
      setMsg(r.ok ? { ok: true, text: `Imported ${r.data.created} item(s)${r.data.skipped ? `, ${r.data.skipped} already existed` : ""}.` } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  };
  const apply = () => start(async () => {
    const r = await applyOrder(type);
    setMsg(r.ok ? { ok: true, text: r.data.changed ? `Applied order and featured settings to ${r.data.changed} live item(s).` : "The live site already uses this order." } : { ok: false, text: r.error });
  });
  return (
    <>
      {canImport && <button type="button" className="adm-btn" onClick={importNow} disabled={pending}>Import starter content</button>}
      {orderable && <button type="button" className="adm-btn" onClick={apply} disabled={pending} title="Publishes only the order and featured flags, not text edits">Apply order to live site</button>}
      {msg && <span className={msg.ok ? "adm-help" : "adm-err"} role="status">{msg.text}</span>}
    </>
  );
}
