import type { MetadataRoute } from "next";
import { PROJECTS } from "@/content/projects";
import { TECHNOLOGIES } from "@/content/technologies";

// Listed for readiness; while ALLOW_INDEXING is not "true" the site is noindex and robots.txt disallows all.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://enginious-com.vercel.app";
  const fixed = ["", "/work", "/technologies", "/solutions", "/company", "/company/team", "/europe", "/uae", "/saudi-arabia", "/insights", "/careers", "/contact"];
  return [
    ...fixed.map((p) => ({ url: `${base}${p}` })),
    ...TECHNOLOGIES.filter((t) => t.detailed).map((t) => ({ url: `${base}/technologies/${t.slug}` })),
    ...PROJECTS.filter((p) => p.caseStudy).map((p) => ({ url: `${base}/work/${p.slug}` })),
  ];
}
