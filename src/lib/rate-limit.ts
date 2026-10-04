import "server-only";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Persistent rate limiting for serverless: counters live in Postgres (public.rate_limit_hit), so every function instance
 * sees the same numbers. Keys are salted hashes, never raw IPs or emails. If the database check itself fails we fail OPEN
 * (an outage must not stop genuine enquiries); the honeypot, size caps and validation still apply.
 */
const salt = () =>
  process.env.RATE_LIMIT_SALT ||
  createHash("sha256").update(`rl:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev"}`).digest("hex");

export const hashKey = (value: string) => createHash("sha256").update(`${salt()}:${value}`).digest("hex").slice(0, 40);

export function clientIp(h: Headers): string {
  const fwd = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim() || "unknown";
}

export interface Limit { name: string; value: string; limit: number; windowSeconds: number }

/** Returns the first limit that is exceeded, or null when the request may proceed. */
export async function checkLimits(limits: Limit[]): Promise<{ name: string; retryAfter: number } | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  for (const l of limits) {
    try {
      const { data, error } = await db.rpc("rate_limit_hit", { p_key: `${l.name}:${hashKey(l.value)}`, p_limit: l.limit, p_window_seconds: l.windowSeconds });
      if (error) continue;
      if (data === false) return { name: l.name, retryAfter: l.windowSeconds };
    } catch {
      /* fail open */
    }
  }
  return null;
}
