import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = () => Boolean(url() && anonKey());

/** Anon client: subject to RLS, no session. Used for public reads. */
export function supabaseAnon() {
  if (!url() || !anonKey()) return null;
  return createClient(url()!, anonKey()!, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Privileged client: bypasses RLS. Server-only, never import from client code. Use only after an explicit role check. */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url() || !key) return null;
  return createClient(url()!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Client acting as the signed-in CMS user (session cookies). Everything it does is subject to RLS, so the database,
 * not the UI, decides what an editor can do. Use in Server Components, Server Actions and Route Handlers.
 */
export async function supabaseUser() {
  if (!url() || !anonKey()) return null;
  const store = await cookies();
  return createServerClient(url()!, anonKey()!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component (read-only cookies); the proxy refreshes the session instead.
        }
      },
    },
  });
}
