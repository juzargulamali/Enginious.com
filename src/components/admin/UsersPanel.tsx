"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { changeRole, inviteUser, removeAccess, setDisabled } from "@/app/(admin)/admin/actions/users";
import { timeAgo } from "@/lib/cms/format";

interface U { user_id: string; role: "administrator" | "editor"; email: string | null; disabled: boolean; created_at: string }

export function UsersPanel({ meId, users }: { meId: string; users: U[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const done = (r: { ok: boolean; error?: string }, ok: string) => { setMsg(r.ok ? { ok: true, text: ok } : { ok: false, text: r.error ?? "Failed" }); if (r.ok) router.refresh(); };

  return (
    <>
      <section className="adm-card" aria-labelledby="inv-h">
        <h2 id="inv-h">Invite someone</h2>
        <form className="adm-form" style={{ marginTop: 12, maxWidth: 560 }} onSubmit={(e) => { e.preventDefault(); setErrors({}); start(async () => { const r = await inviteUser({ email, role }); if (r.ok) { setEmail(""); done(r, `Invitation sent to ${r.data.email}.`); } else { setErrors(r.fieldErrors ?? {}); setMsg({ ok: false, text: r.error }); } }); }} noValidate>
          <div className="adm-field" data-invalid={!!errors.email}><label htmlFor="inv-email">Email</label><input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" aria-invalid={!!errors.email} />{errors.email && <p className="adm-err">{errors.email}</p>}</div>
          <div className="adm-field"><label htmlFor="inv-role">Role</label><select id="inv-role" value={role} onChange={(e) => setRole(e.target.value)}><option value="editor">Editor: content and enquiries</option><option value="administrator">Administrator: also access, settings and deletion</option></select></div>
          <div className="adm-actions"><button className="adm-btn adm-btn-primary" type="submit" disabled={pending || !email}>Send invitation</button></div>
        </form>
        {msg && <p className={`adm-alert ${msg.ok ? "adm-alert-ok" : "adm-alert-error"}`} role="status" style={{ marginTop: 12 }}>{msg.text}</p>}
      </section>

      <section style={{ marginTop: 16 }} aria-labelledby="team-h">
        <h2 id="team-h" style={{ marginBottom: 10 }}>People with access</h2>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th scope="col">Person</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col" className="num">Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td data-label="Person"><b>{u.email ?? u.user_id}</b>{u.user_id === meId && <span className="adm-help"> (you)</span>}<span className="sub">Added {timeAgo(u.created_at)}</span></td>
                  <td data-label="Role">
                    <label className="skip" htmlFor={`role-${u.user_id}`}>Role for {u.email}</label>
                    <select id={`role-${u.user_id}`} value={u.role} disabled={pending} onChange={(e) => start(async () => done(await changeRole(u.user_id, e.target.value), "Role updated."))} style={{ width: "auto" }}><option value="editor">Editor</option><option value="administrator">Administrator</option></select>
                  </td>
                  <td data-label="Status"><span className="adm-badge" data-s={u.disabled ? "archived" : "published"}>{u.disabled ? "disabled" : "active"}</span></td>
                  <td className="num" data-label="Actions">
                    <button type="button" className="adm-btn adm-btn-sm" disabled={pending} onClick={() => start(async () => done(await setDisabled(u.user_id, !u.disabled), u.disabled ? "Enabled." : "Disabled."))}>{u.disabled ? "Enable" : "Disable"}</button>{" "}
                    <button type="button" className="adm-btn adm-btn-sm adm-btn-danger" disabled={pending} onClick={() => { if (window.confirm(`Remove CMS access for ${u.email ?? "this user"}?`)) start(async () => done(await removeAccess(u.user_id), "Access removed.")); }}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="adm-help" style={{ marginTop: 10 }}>At least one active administrator must always remain. Removing access does not delete the sign-in account.</p>
      </section>
    </>
  );
}
