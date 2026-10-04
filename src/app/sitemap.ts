import type { MetadataRoute } from "next";
import { getContent } from "@/lib/content/load";
import { indexingAllowed, publicOrigin } from "@/lib/seo/indexing";
import { PAGE_SEO_PATHS } from "@/lib/cms/schema";

/**
 * The sitemap lists only published, indexable public pages, on the configured PUBLIC origin. While indexing is off (previews,
 * and production until launch) it is empty, so a Vercel preview hostname can never be advertised.
 * Items marked "hide from search engines" in the CMS are excluded. Unpublished and archived items are not in the data at all.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = publicOrigin();
  if (!indexingAllowed() || !origin) return [];
  const c = await getContent();
  const pageHidden = (key: string) => c.pageSeo[key]?.noindex === true;
  const fixed = Object.entries(PAGE_SEO_PATHS).filter(([key]) => key !== "privacy" && !pageHidden(key)).map(([, path]) => ({ url: `${origin}${path === "/" ? "" : path}` }));
  return [
    ...fixed,
    ...c.technologies.filter((t) => t.detailed && t.seo?.noindex !== true).map((t) => ({ url: `${origin}/technologies/${t.slug}` })),
    ...c.projects.filter((p) => p.caseStudy && p.seo?.noindex !== true).map((p) => ({ url: `${origin}/work/${p.slug}` })),
    ...c.articles.filter((a) => a.seo.noindex !== true).map((a) => ({ url: `${origin}/insights/${a.slug}`, lastModified: a.updatedAt })),
    ...c.roles.filter((r) => r.seo.noindex !== true).map((r) => ({ url: `${origin}/careers/${r.slug}`, lastModified: r.publishedAt })),
  ];
}
