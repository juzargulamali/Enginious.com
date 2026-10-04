import type { NextConfig } from "next";

// Response headers. The noindex header is the safety net behind the <meta robots> tag and robots.txt:
//  - admin, API and internal routes are ALWAYS noindex, whatever the launch settings;
//  - every other route is noindex unless indexing is explicitly enabled for a production deployment
//    (same rule as src/lib/seo/indexing.ts; kept inline because next.config cannot import app code).
const indexingEnabled = () => {
  if (process.env.ALLOW_INDEXING !== "true") return false;
  if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") return false;
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    return u.protocol === "https:" && !u.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
};

const NOINDEX = { key: "X-Robots-Tag", value: "noindex, nofollow" };

const nextConfig: NextConfig = {
  async headers() {
    const always = [
      { source: "/admin/:path*", headers: [NOINDEX, { key: "Cache-Control", value: "no-store" }] },
      { source: "/api/:path*", headers: [NOINDEX] },
      { source: "/setup-check", headers: [NOINDEX] },
    ];
    if (indexingEnabled()) return always;
    return [...always, { source: "/:path*", headers: [NOINDEX] }];
  },
};

export default nextConfig;
