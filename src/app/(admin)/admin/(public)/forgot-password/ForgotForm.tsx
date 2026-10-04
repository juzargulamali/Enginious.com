"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "../../actions/auth";

export function ForgotForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  return (
    <form action={action} className="adm-form" noValidate>
      <div className="adm-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      {state.error && <p className="adm-alert adm-alert-error" role="alert">{state.error}</p>}
      {state.message && <p className="adm-alert adm-alert-ok" role="status">{state.message}</p>}
      <button className="adm-btn adm-btn-primary" type="submit" disabled={pending}>{pending ? "Sending..." : "Send reset link"}</button>
      <p className="adm-hint"><Link href="/admin/login">Back to sign in</Link></p>
    </form>
  );
}
