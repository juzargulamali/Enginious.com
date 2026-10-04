"use client";

import { useActionState } from "react";
import { setPassword, type AuthState } from "../../actions/auth";

export function SetPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(setPassword, {});
  return (
    <form action={action} className="adm-form" noValidate>
      <div className="adm-field">
        <label htmlFor="password">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required />
      </div>
      <div className="adm-field">
        <label htmlFor="confirm">Repeat the password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={12} required />
      </div>
      {state.error && <p className="adm-alert adm-alert-error" role="alert">{state.error}</p>}
      <button className="adm-btn adm-btn-primary" type="submit" disabled={pending}>{pending ? "Saving..." : "Save password and continue"}</button>
    </form>
  );
}
