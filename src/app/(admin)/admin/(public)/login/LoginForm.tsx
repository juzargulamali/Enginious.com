"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthState } from "../../actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  return (
    <form action={action} className="adm-form" noValidate>
      <input type="hidden" name="next" value={next} />
      <div className="adm-field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="adm-field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error && <p className="adm-alert adm-alert-error" role="alert">{state.error}</p>}
      <button className="adm-btn adm-btn-primary" type="submit" disabled={pending}>{pending ? "Signing in..." : "Sign in"}</button>
      <p className="adm-hint"><Link href="/admin/forgot-password">Forgot your password?</Link></p>
    </form>
  );
}
