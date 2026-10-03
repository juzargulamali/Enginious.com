import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // Keep previews and non-production deployments out of search indexes.
    if (process.env.VERCEL_ENV === "production") return [];
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
};

export default nextConfig;
