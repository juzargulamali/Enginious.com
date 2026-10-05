import "server-only";
import type { ClientContent, LeanRegion } from "@/components/ContentProvider";
import type { SiteContent } from "./types";

/** The slice client components receive. Drops long text and CMS-only extras to keep the page payload small. */
export function toClientContent(c: SiteContent): ClientContent {
  const regions = Object.fromEntries(Object.entries(c.regions).map(([k, r]) => [k, { key: r.key, name: r.name, role: r.role, email: r.email, phone: r.phone, city: r.city, href: r.href } satisfies LeanRegion])) as ClientContent["regions"];
  return {
    projects: c.projects.map((p) => ({ slug: p.slug, title: p.title, client: p.client, event: p.event, location: p.location, region: p.region, year: p.year, sector: p.sector, summary: p.summary, technologies: p.technologies, caseStudy: p.caseStudy, featured: p.featured })),
    technologies: c.technologies.map((t) => ({ slug: t.slug, name: t.name, category: t.category, summary: t.summary, projects: t.projects, detailed: t.detailed, showcaseImage: t.showcaseImage })),
    people: c.people,
    leaders: Object.fromEntries(Object.entries(c.leaders).map(([k, l]) => [k, { photo: l.photo, responsibilities: l.responsibilities, message: l.message, approved: l.approved }])),
    clients: c.clients.map((x) => ({ id: x.id, name: x.name, relationship: x.relationship, logo: x.logo, projects: x.projects, attribution: x.attribution })),
    regions,
    general: { email: c.settings.contactEmail, phone: c.settings.contactPhone },
    images: c.images,
    slots: c.slots,
  };
}
