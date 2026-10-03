import type { MetadataRoute } from "next";

// Only the production deployment is indexable; previews and local dev are blocked.
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return { rules: { userAgent: "*", allow: "/", disallow: ["/setup-check"] } };
}
