/**
 * The single place that decides whether search engines may index this deployment.
 *
 * Indexing is OFF unless ALL of these hold:
 *   1. ALLOW_INDEXING === "true"                       (explicit owner opt-in, production environment variable only)
 *   2. this is not a preview or development deployment (VERCEL_ENV is "preview" or "development" => never indexable)
 *   3. NEXT_PUBLIC_SITE_URL is set to the real public origin (https, not *.vercel.app)
 * So a stray ALLOW_INDEXING on a preview, or a missing/preview origin, can never leak a vercel.app hostname into the index.
 * Admin, authentication, API and internal routes are excluded regardless (see EXCLUDED_PREFIXES, next.config.ts and proxy.ts).
 */
export const EXCLUDED_PREFIXES = ["/admin", "/api", "/setup-check"] as const;

const configuredOrigin = (): string | null => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    if (u.hostname.endsWith(".vercel.app")) return null;
    return u.origin;
  } catch {
    return null;
  }
};

/** The public production origin, or null when none is configured (then nothing is indexable). */
export const publicOrigin = configuredOrigin;

export function indexingAllowed(): boolean {
  if (process.env.ALLOW_INDEXING !== "true") return false;
  const env = process.env.VERCEL_ENV;
  if (env === "preview" || env === "development") return false;
  return configuredOrigin() !== null;
}

/** Base URL for metadataBase. Falls back to the preview/deployment host so Open Graph URLs resolve, but is never used for sitemaps or canonicals when indexing is off. */
export function metadataOrigin(): string {
  return (
    configuredOrigin() ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"))
  );
}

export const isExcludedPath = (pathname: string) =>
  EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
