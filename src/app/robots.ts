import type { MetadataRoute } from "next";

// Indexing is opt-in: set ALLOW_INDEXING=true on the real production site only.
export default function robots(): MetadataRoute.Robots {
  if (process.env.ALLOW_INDEXING !== "true") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://enginious-com.vercel.app";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/setup-check", "/api/"] }, sitemap: `${base}/sitemap.xml` };
}
