import "server-only";
import { publicOrigin } from "./indexing";
import type { SiteContent } from "@/lib/content/types";

/**
 * Structured data uses only verified facts that are already published on the site: company name and contact, the Dubai
 * headquarters, social profiles that were entered in the CMS, breadcrumbs, articles and open roles.
 * It deliberately never emits ratings, reviews or testimonials.
 */
const abs = (path: string) => `${publicOrigin() ?? ""}${path}`;

export function organizationLd(c: SiteContent) {
  const s = c.settings;
  const sameAs = Object.values(s.social).filter((v): v is string => !!v);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: s.companyName,
    ...(publicOrigin() ? { url: publicOrigin() } : {}),
    ...(s.tagline ? { slogan: s.tagline } : { slogan: "Driven by innovation" }),
    ...(publicOrigin() ? { logo: abs("/brand/enginious-mark.svg") } : {}),
    email: s.contactEmail,
    telephone: s.contactPhone,
    address: { "@type": "PostalAddress", addressLocality: "Dubai", addressCountry: "AE" },
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, ...(publicOrigin() ? { item: abs(t.path) } : {}) })),
  };
}

export function articleLd(c: SiteContent, a: { title: string; excerpt: string; path: string; publishedOn?: string; updatedAt?: string; author?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title.slice(0, 110),
    description: a.excerpt,
    ...(a.publishedOn ? { datePublished: a.publishedOn } : {}),
    ...(a.updatedAt ? { dateModified: a.updatedAt } : {}),
    ...(a.author ? { author: { "@type": "Person", name: c.people.find((p) => p.id === a.author)?.name ?? a.author } } : {}),
    publisher: { "@type": "Organization", name: c.settings.companyName },
    ...(publicOrigin() ? { mainEntityOfPage: abs(a.path) } : {}),
  };
}

export function jobPostingLd(c: SiteContent, r: { title: string; description: string; location: string; path: string; publishedAt?: string; closesOn?: string; employmentType?: string }) {
  const TYPE: Record<string, string> = { "full-time": "FULL_TIME", "part-time": "PART_TIME", contract: "CONTRACTOR", internship: "INTERN" };
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: r.title,
    description: r.description,
    ...(r.publishedAt ? { datePosted: r.publishedAt.slice(0, 10) } : {}),
    ...(r.closesOn ? { validThrough: r.closesOn } : {}),
    ...(r.employmentType && TYPE[r.employmentType] ? { employmentType: TYPE[r.employmentType] } : {}),
    hiringOrganization: { "@type": "Organization", name: c.settings.companyName },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: r.location } },
  };
}
