"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { purgeEnquiries } from "@/app/(admin)/admin/actions/enquiries";

export function PurgeTool() {
  const router = useRouter();
  const [days, setDays] = useState(730);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = () => {
    if (!window.confirm(`Permanently delete every CLOSED or SPAM enquiry older than ${days} days, with its notes and attachments? This cannot be undone.`)) return;
    start(async () => {
      const r = await purgeEnquiries(days);
      setMsg(r.ok ? { ok: true, text: `Deleted ${r.data.deleted} enquir${r.data.deleted === 1 ? "y" : "ies"}.` } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  };
  return (
    <div className="adm-toolbar" style={{ marginBottom: 0 }}>
      <label htmlFor="purge-days">Older than (days)</label>
      <input id="purge-days" type="number" min={30} value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 110 }} />
      <button type="button" className="adm-btn adm-btn-danger" onClick={run} disabled={pending}>Delete closed and spam enquiries</button>
      {msg && <span className={msg.ok ? "adm-help" : "adm-err"} role="status">{msg.text}</span>}
    </div>
  );
}
