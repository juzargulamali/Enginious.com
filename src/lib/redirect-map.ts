// Redirect lookup used by proxy.ts. Reads the enabled rows of public.redirects with the anon key (RLS: public may read enabled rows),
// keeps them in memory per server instance and refreshes in the background, so most requests cost one Map lookup.
// Fails open: if the database is unreachable the site keeps serving pages and just skips custom redirects.
type Rule = { target: string; status: number };

let rules = new Map<string, Rule>();
let loadedAt = 0;
let inflight: Promise<void> | null = null;
const TTL_MS = Number(process.env.REDIRECT_MAP_TTL_MS) || 60_000; // tests set a short TTL

async function refresh(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) { loadedAt = Date.now(); return; }
  try {
    const res = await fetch(`${url}/rest/v1/redirects?select=source_path,target,status_code&enabled=eq.true&limit=2000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      const rows = (await res.json()) as { source_path: string; target: string; status_code: number }[];
      rules = new Map(rows.map((r) => [r.source_path, { target: r.target, status: r.status_code }]));
    }
  } catch {
    /* keep the previous rules */
  } finally {
    loadedAt = Date.now();
  }
}

export async function findRedirect(pathname: string): Promise<Rule | null> {
  const stale = Date.now() - loadedAt > TTL_MS;
  if (loadedAt === 0) { inflight ??= refresh().finally(() => { inflight = null; }); await inflight; }
  else if (stale && !inflight) inflight = refresh().finally(() => { inflight = null; });
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return rules.get(clean) ?? null;
}

/** Test hook. */
export const _resetRedirectMap = () => { rules = new Map(); loadedAt = 0; inflight = null; };
