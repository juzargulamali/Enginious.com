"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Fallback for Supabase's default invite/recovery links, which return the session in the URL fragment
 * (#access_token=...&refresh_token=...). The fragment is only readable in the browser, so we hand it to the Supabase
 * client, which stores the session in cookies, then continue to the password screen.
 */
export function CallbackClient() {
  const [msg, setMsg] = useState("One moment...");
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const access = hash.get("access_token");
    const refresh = hash.get("refresh_token");
    if (!url || !key || !access || !refresh) { window.location.replace("/admin/set-password"); return; }
    createBrowserClient(url, key).auth.setSession({ access_token: access, refresh_token: refresh }).then(({ error }) => {
      history.replaceState(null, "", window.location.pathname);
      if (error) setMsg("This link has expired. Request a new one from the sign-in page.");
      else window.location.replace("/admin/set-password");
    });
  }, []);
  return <p className="adm-hint" role="status">{msg}</p>;
}
