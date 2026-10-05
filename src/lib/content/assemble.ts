import "server-only";
import { seedItems } from "./seed";
import { CONTENT_TYPES, type ContentType } from "@/lib/cms/schema";
import { REGIONS, GENERAL_CONTACT, type RegionKey } from "@/content/site";
import { IMAGES } from "@/content/images";
import { publicUrl } from "@/lib/media";
import type { Project } from "@/content/projects";
import type { Technology } from "@/content/technologies";
import type { Person } from "@/content/team";
import type { LeaderInfo } from "@/content/leaders";
import type { Client } from "@/content/clients";
import type { Testimonial } from "@/content/testimonials";
import type { ImageAsset } from "@/content/images";
import type { Article, CompanySection, Faq, JobRole, MediaRow, PublishedRow, RegionContent, SeoFields, SiteContent, SiteSettings, Solution } from "./types";

type D = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
// The public mapping re-checks every value that becomes a link, so even content written around the admin forms (straight to the
// database by a signed-in editor) cannot put an unsafe URL, canonical or address on a public page.
const httpsUrl = (v: unknown): string | undefined => { const x = str(v); return x && /^https:\/\/[^\s<>"'\\]+$/.test(x) ? x : undefined; };
const sitePath = (v: unknown): string | undefined => { const x = str(v); return x && /^\/(?!\/)[^\s\\]*$/.test(x) ? x : undefined; };
const emailOf = (v: unknown): string | undefined => { const x = str(v); return x && /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(x) ? x : undefined; };
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const recs = (v: unknown): D[] => (Array.isArray(v) ? v.filter((x): x is D => typeof x === "object" && x !== null) : []);

const seoOf = (d: D): SeoFields => ({ title: str(d.seo_title), description: str(d.seo_description), image: str(d.seo_image), canonical: sitePath(d.seo_canonical), noindex: d.seo_noindex === true ? true : undefined });

export const REGION_KEYS: RegionKey[] = ["uae", "ksa", "europe"];

/** Starter content expressed as published rows, so static and CMS content go through the same mapping. */
function seedRows(type: ContentType): PublishedRow[] {
  return seedItems(type).map((s) => ({
    item_id: `seed-${type}-${s.slug}`, type, locale: "en", slug: s.slug, title: s.title, data: s.data,
    sort_order: s.sort_order, featured: s.featured, version: 0, published_at: "1970-01-01T00:00:00Z",
  }));
}

export function toImageAsset(m: MediaRow): ImageAsset | null {
  if (m.kind === "document" || !m.width || !m.height) return null;
  const widths = (m.variants && m.variants.length ? m.variants : [480, 960, 1600]).slice().sort((a, b) => a - b);
  return {
    id: m.id,
    kind: m.kind === "portrait" ? "portrait" : "scene",
    status: m.status as ImageAsset["status"],
    src: publicUrl("media", m.storage_path),
    widths,
    width: m.width,
    height: m.height,
    focal: [Number(m.focal_x), Number(m.focal_y)],
    alt: m.alt,
    credit: m.credit ?? "",
    source: m.source_url ?? "",
    licence: m.licence ?? "",
  };
}

export function assemble(rows: PublishedRow[], initialised: ReadonlySet<ContentType>, media: MediaRow[]): SiteContent {
  const sources = {} as Record<ContentType, "cms" | "static">;
  const byType = {} as Record<ContentType, PublishedRow[]>;
  for (const t of CONTENT_TYPES) {
    const cms = initialised.has(t);
    sources[t] = cms ? "cms" : "static";
    byType[t] = (cms ? rows.filter((r) => r.type === t && r.locale === "en") : seedRows(t)).slice().sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
  }

  const projects: Project[] = byType.project.map((r) => ({
    slug: r.slug, title: r.title, client: str(r.data.client) ?? "", event: str(r.data.event) ?? "", location: str(r.data.location) ?? "",
    region: (str(r.data.region) as Project["region"]) ?? "international", year: num(r.data.year) ?? 0, sector: str(r.data.sector) ?? "",
    summary: str(r.data.summary) ?? "", technologies: strs(r.data.technologies), caseStudy: r.data.case_study === true,
    clientAttribution: str(r.data.client_attribution), challenge: str(r.data.challenge), experience: str(r.data.experience),
    outcomes: recs(r.data.outcomes).filter((o) => o.verified === true && str(o.label) && str(o.value)).map((o) => ({ label: String(o.label), value: String(o.value), source: str(o.source) })),
    media: strs(r.data.media), featured: r.featured, seo: seoOf(r.data),
  }));

  const technologies: Technology[] = byType.technology.map((r) => ({
    slug: r.slug, name: r.title, category: (str(r.data.category) as Technology["category"]) ?? "interactive", summary: str(r.data.summary) ?? "",
    projects: strs(r.data.projects), detailed: r.data.detailed === true, description: str(r.data.description), useCases: strs(r.data.use_cases),
    specs: recs(r.data.specs).filter((s) => s.confirmed === true && str(s.label) && str(s.value)).map((s) => ({ label: String(s.label), value: String(s.value) })),
    media: strs(r.data.media), showcaseImage: str(r.data.showcase_image), showcaseAnimation: str(r.data.showcase_animation), showcaseScale: num(r.data.showcase_scale), showcaseY: num(r.data.showcase_y), featured: r.featured, seo: seoOf(r.data),
  }));

  const people: Person[] = [];
  const leaders: Record<string, LeaderInfo> = {};
  for (const r of byType.person) {
    people.push({ id: r.slug, name: r.title, role: str(r.data.role) ?? "", dept: (str(r.data.department) as Person["dept"]) ?? "business" });
    const message = str(r.data.message); // already withheld by the database unless approved
    if (r.data.leadership === true || r.data.portrait || r.data.bio || strs(r.data.responsibilities).length || message) {
      leaders[r.slug] = { photo: str(r.data.portrait), responsibilities: strs(r.data.responsibilities), message, approved: !!message, bio: str(r.data.bio) };
    }
  }

  const clients: Client[] = byType.client.map((r) => ({
    id: r.slug, name: r.title, relationship: (str(r.data.relationship) as Client["relationship"]) ?? "unconfirmed", logo: str(r.data.logo), projects: strs(r.data.projects),
    attribution: str(r.data.attribution), website: httpsUrl(r.data.website),
  }));

  const testimonials: Testimonial[] = byType.testimonial.map((r, i) => ({
    id: r.slug, quote: str(r.data.quote) ?? "", name: str(r.data.speaker_name) ?? "", role: str(r.data.speaker_role) ?? "", organisation: str(r.data.organisation) ?? "",
    clientId: str(r.data.client), projectSlug: str(r.data.project), published: true, order: r.sort_order || i,
  })).filter((t) => t.quote && t.name);

  const regions = {} as Record<RegionKey, RegionContent>;
  for (const key of REGION_KEYS) {
    const r = byType.region.find((x) => x.slug === key);
    const base = REGIONS[key];
    regions[key] = r
      ? {
          key, name: r.title, role: str(r.data.role_label) ?? base.role, email: emailOf(r.data.email) ?? null, phone: str(r.data.phone) ?? null, city: str(r.data.city) ?? null, href: base.href,
          intro: str(r.data.intro), address: str(r.data.address), capabilities: strs(r.data.capabilities), projects: strs(r.data.projects),
        }
      : { ...base, capabilities: [], projects: [] }; // fixed routes always exist
  }

  const sRow = byType.setting.find((x) => x.slug === "site");
  const sd: D = sRow?.data ?? {};
  const settings: SiteSettings = {
    companyName: str(sd.company_name) ?? "Enginious", tagline: str(sd.tagline),
    contactEmail: emailOf(sd.contact_email) ?? GENERAL_CONTACT.email, contactPhone: str(sd.contact_phone) ?? GENERAL_CONTACT.phone,
    social: { linkedin: httpsUrl(sd.linkedin), instagram: httpsUrl(sd.instagram), x: httpsUrl(sd.x), youtube: httpsUrl(sd.youtube) },
    footerText: str(sd.footer_text),
    defaultSeo: { title: str(sd.default_seo_title), description: str(sd.default_seo_description), image: str(sd.default_seo_image) },
    companyProfile: str(sd.company_profile), showreelYoutubeId: str(sd.showreel_youtube_id), filmYoutubeId: str(sd.film_youtube_id), showreelMp4Url: httpsUrl(sd.showreel_mp4_url), showreelPoster: str(sd.showreel_poster),
    privacyStatus: sd.privacy_status === "approved" ? "approved" : "provisional",
  };
  const doc = settings.companyProfile ? media.find((m) => m.id === settings.companyProfile && m.kind === "document" && m.visibility === "public") : undefined;
  if (doc) settings.companyProfileUrl = publicUrl("documents", doc.storage_path);

  const slotKeys: Record<string, string> = { slot_cap_events: "capEvents", slot_cap_centres: "capCentres", slot_cap_permanent: "capPermanent", slot_contact_scene: "contactScene", slot_preview_male: "previewMale", slot_preview_female: "previewFemale" };
  const slots: Record<string, string> = {};
  for (const [k, slot] of Object.entries(slotKeys)) { const v = str(sd[k]); if (v) slots[slot] = v; }

  const faqs: Faq[] = byType.faq.map((r) => ({ slug: r.slug, question: r.title, answer: str(r.data.answer) ?? "", category: str(r.data.category), order: r.sort_order }));
  const solutions: Solution[] = byType.solution.map((r) => ({
    slug: r.slug, title: r.title, summary: str(r.data.summary) ?? "", body: str(r.data.body), benefits: strs(r.data.benefits),
    process: recs(r.data.process).map((p) => ({ title: str(p.title) ?? "", body: str(p.body) })).filter((p) => p.title),
    technologies: strs(r.data.technologies), projects: strs(r.data.projects), media: strs(r.data.media), order: r.sort_order, featured: r.featured,
  }));
  const articles: Article[] = byType.article.map((r) => ({
    slug: r.slug, title: r.title, excerpt: str(r.data.excerpt) ?? "", body: str(r.data.body) ?? "", category: str(r.data.category), author: str(r.data.author),
    publishedOn: str(r.data.published_on) ?? r.published_at.slice(0, 10), cover: str(r.data.cover), technologies: strs(r.data.technologies), projects: strs(r.data.projects),
    featured: r.featured, seo: seoOf(r.data), updatedAt: r.published_at,
  })).sort((a, b) => (b.publishedOn ?? "").localeCompare(a.publishedOn ?? ""));
  const roles: JobRole[] = byType.role.map((r) => ({
    slug: r.slug, title: r.title, department: str(r.data.department), location: str(r.data.location) ?? "", employmentType: str(r.data.employment_type),
    description: str(r.data.description) ?? "", requirements: str(r.data.requirements), applyUrl: httpsUrl(r.data.apply_url), applyEmail: emailOf(r.data.apply_email),
    closesOn: str(r.data.closes_on), order: r.sort_order, seo: seoOf(r.data), publishedAt: r.published_at,
  }));
  const company: Record<string, CompanySection> = {};
  for (const r of byType.company_section) company[r.slug] = { slug: r.slug, title: r.title, body: str(r.data.body) ?? "", steps: recs(r.data.steps).map((s) => ({ title: str(s.title) ?? "", body: str(s.body) })).filter((s) => s.title) };
  const pageSeo: Record<string, SeoFields> = {};
  for (const r of byType.page_seo) pageSeo[r.slug] = seoOf(r.data);

  const images: Record<string, ImageAsset> = { ...IMAGES };
  for (const m of media) { if (m.visibility !== "public") continue; const a = toImageAsset(m); if (a) images[m.id] = a; }

  return { sources, projects, technologies, people, leaders, clients, testimonials, regions, settings, faqs, solutions, articles, roles, company, pageSeo, images, slots };
}
