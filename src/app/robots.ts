import type { MetadataRoute } from "next";
import { EXCLUDED_PREFIXES, indexingAllowed, publicOrigin } from "@/lib/seo/indexing";

// Disallow everything unless indexing is explicitly enabled for a real production deployment (see lib/seo/indexing.ts).
// Admin, API and internal routes stay disallowed even after launch.
export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: [...EXCLUDED_PREFIXES, "/privacy"] }, sitemap: `${publicOrigin()}/sitemap.xml` };
}
