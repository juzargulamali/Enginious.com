"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { applyOrder } from "@/app/(admin)/admin/actions/content";
import { importStarterContent, publishReviewedImport } from "@/app/(admin)/admin/actions/import";

export function ListTools({ type, orderable, canImport, isAdmin, adopted, pendingImported }: { type: string; orderable: boolean; canImport: boolean; isAdmin: boolean; adopted: boolean; pendingImported: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [reviewing, setReviewing] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const importNow = () => {
    if (!window.confirm("Copy the built-in starter content for this type into the CMS as DRAFTS?\n\nNothing is published and the live site does not change. You review the drafts, then an administrator publishes them in a separate step.")) return;
    start(async () => {
      const r = await importStarterContent(type);
      setMsg(r.ok ? { ok: true, text: `Imported ${r.data.created} draft(s)${r.data.skipped ? `, ${r.data.skipped} already existed` : ""}. The live site is unchanged until the reviewed publishing step.` } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  };
  const publishNow = () => start(async () => {
    const r = await publishReviewedImport(type, reviewed);
    setMsg(r.ok ? { ok: true, text: `Published ${r.data.published} reviewed item(s). The live site now uses the CMS for this type.` } : { ok: false, text: r.error });
    if (r.ok) { setReviewing(false); setReviewed(false); router.refresh(); }
  });
  const apply = () => start(async () => {
    const r = await applyOrder(type);
    setMsg(r.ok ? { ok: true, text: r.data.changed ? `Applied order and featured settings to ${r.data.changed} live item(s).` : "The live site already uses this order." } : { ok: false, text: r.error });
  });
  return (
    <>
      {canImport && <button type="button" className="adm-btn" onClick={importNow} disabled={pending}>Import starter content as drafts</button>}
      {canImport && !adopted && pendingImported > 0 && isAdmin && <button type="button" className="adm-btn adm-btn-primary" onClick={() => setReviewing((v) => !v)} aria-expanded={reviewing}>Review and publish imported content</button>}
      {orderable && <button type="button" className="adm-btn" onClick={apply} disabled={pending} title="Publishes only the order and featured flags, not text edits">Apply order to live site</button>}
      {reviewing && (
        <fieldset className="adm-alert" style={{ flexBasis: "100%" }}>
          <legend>Reviewed publishing step</legend>
          <p>This publishes all {pendingImported} imported draft(s) of this type and switches the live site from the built-in starter content to the CMS. If any draft fails validation, nothing is published.</p>
          <label><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> I have opened and reviewed every imported item and the live site may use them.</label>
          <p><button type="button" className="adm-btn adm-btn-primary" onClick={publishNow} disabled={pending || !reviewed}>Publish reviewed content</button></p>
        </fieldset>
      )}
      {msg && <span className={msg.ok ? "adm-help" : "adm-err"} role="status">{msg.text}</span>}
    </>
  );
}
