import "server-only";
// Starter content: the approved content that already lives in src/content/*.ts, expressed as CMS items.
// Used (1) as the public fallback for any type the CMS has not taken over yet, and (2) by the admin "Import" action,
// which creates drafts and publishes them so the CMS starts from exactly what the public site already shows.
// NOTHING unapproved is imported: fictional testimonials are skipped, leadership messages are not included.
import { PROJECTS } from "@/content/projects";
import { TECHNOLOGIES } from "@/content/technologies";
import { PEOPLE } from "@/content/team";
import { LEADERS } from "@/content/leaders";
import { CLIENTS } from "@/content/clients";
import { REGIONS, SERVICES, GENERAL_CONTACT } from "@/content/site";
import { YOUTUBE } from "@/content/media";
import { CONTENT_TYPES, PAGE_SEO_PATHS, type ContentType, type Data } from "@/lib/cms/schema";

export interface SeedItem { slug: string; title: string; data: Data; sort_order: number; featured: boolean }

const FEATURED_PROJECTS = new Set(["whx", "dubai-air-show", "cityscape", "global-health-exhibition", "f1-etihad"]);

const COMPANY: SeedItem[] = [
  {
    slug: "story", title: "Where innovators meet artisans.", sort_order: 10, featured: false,
    data: {
      body: "Enginious is a tribe of engineers, creative artists and designers who push the boundaries of technology to captivate audiences, elevate brands and deliver transformative experiences.\n\nWe work with brands, agencies, corporate marketing teams, government organisations and teams developing permanent experience spaces, from kinetic displays and interactive installations to immersive environments, AI activations, AR and VR, and bespoke applications.\n\nOur global headquarters is in Dubai, with a branch in Saudi Arabia and a branch in Poland serving Europe.",
    },
  },
  { slug: "mission", title: "Mission", sort_order: 20, featured: false, data: { body: "To help organisations captivate their audiences with experiential technology that is engineered, built and supported by one team.", _note: "DRAFT wording from the company profile. Needs owner approval (docs/content-todo.md)." } },
  { slug: "vision", title: "Vision", sort_order: 30, featured: false, data: { body: "To lead the way in innovative, immersive experiences: pioneering customisable technology for events, automation and robotics around the world.", _note: "DRAFT wording from the company profile. Needs owner approval (docs/content-todo.md)." } },
  {
    slug: "process", title: "Creative, content, software, hardware and delivery: connected.", sort_order: 40, featured: false,
    data: {
      body: "One team, one sequence: developed together, tested together, then installed and supported by the people who made it.",
      steps: [
        { title: "Strategy", body: "The idea and the audience." }, { title: "Creative & content", body: "2D and 3D storytelling." },
        { title: "Software", body: "Interactive applications." }, { title: "Hardware & engineering", body: "Mechatronics and product design." },
        { title: "Integration & testing", body: "Joined and tested as one system." }, { title: "Installation", body: "On the show floor, on schedule." },
        { title: "Support", body: "Operation and maintenance." },
      ],
    },
  },
];

const PAGE_TITLES: Record<string, string> = {
  home: "Home", work: "Work", technologies: "Technologies", solutions: "Solutions", company: "Company", team: "Team and leadership",
  uae: "UAE", "saudi-arabia": "Saudi Arabia", europe: "Europe", insights: "Insights", careers: "Careers", contact: "Contact", privacy: "Privacy notice",
};
const PAGE_DESCRIPTIONS: Record<string, string> = {
  work: "Experiential technology delivered by Enginious for events, exhibitions, brand activations and permanent installations across the Middle East and beyond.",
  solutions: "What you can commission from Enginious: experiential technology, content, software and engineering.",
  company: "How Enginious works: creative strategy, content, software, hardware, engineering, installation and support in one team, headquartered in Dubai with branches in Saudi Arabia and Poland.",
  team: "Meet the engineers, creators and problem-solvers behind Enginious, and the leadership guiding the company.",
  uae: "Enginious in the UAE: global headquarters in Dubai.",
  "saudi-arabia": "Enginious in Saudi Arabia: our branch in the Kingdom.",
  insights: "Project stories, technology explainers and guidance from Enginious.",
  careers: "Careers and internships at Enginious.",
  contact: "Tell Enginious about your project. Choose the Dubai, Saudi Arabia or Poland (Europe) team and we will connect you with the right people.",
};

const REGION_ORDER: Record<string, number> = { uae: 10, ksa: 20, europe: 30 };

export function seedItems(type: ContentType): SeedItem[] {
  switch (type) {
    case "project":
      return PROJECTS.map((p, i) => ({
        slug: p.slug, title: p.title, sort_order: (i + 1) * 10, featured: FEATURED_PROJECTS.has(p.slug),
        data: { client: p.client, event: p.event, location: p.location, region: p.region, year: p.year, sector: p.sector, summary: p.summary, technologies: p.technologies, case_study: p.caseStudy === true },
      }));
    case "technology":
      return TECHNOLOGIES.map((t, i) => ({ slug: t.slug, title: t.name, sort_order: (i + 1) * 10, featured: false, data: { category: t.category, summary: t.summary, detailed: t.detailed === true, projects: t.projects } }));
    case "person":
      return PEOPLE.map((p, i) => {
        const l = LEADERS[p.id];
        return { slug: p.id, title: p.name, sort_order: (i + 1) * 10, featured: p.dept === "leadership", data: { role: p.role, department: p.dept, leadership: p.dept === "leadership", ...(l?.photo ? { portrait: l.photo } : {}), ...(l?.responsibilities?.length ? { responsibilities: l.responsibilities } : {}) } };
      });
    case "client":
      return CLIENTS.map((c, i) => ({ slug: c.id, title: c.name, sort_order: (i + 1) * 10, featured: false, data: { relationship: c.relationship, projects: c.projects } }));
    case "region":
      return (Object.values(REGIONS)).map((r) => ({
        slug: r.key, title: r.name, sort_order: REGION_ORDER[r.key] ?? 100, featured: false,
        data: { role_label: r.role, ...(r.city ? { city: r.city } : {}), ...(r.email ? { email: r.email } : {}), ...(r.phone ? { phone: r.phone } : {}) },
      }));
    case "solution":
      return SERVICES.map((s, i) => ({ slug: s.title.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80), title: s.title, sort_order: (i + 1) * 10, featured: false, data: { summary: s.body } }));
    case "company_section":
      return COMPANY;
    case "setting":
      return [{ slug: "site", title: "Site settings", sort_order: 0, featured: false, data: { company_name: "Enginious", contact_email: GENERAL_CONTACT.email, contact_phone: GENERAL_CONTACT.phone, showreel_youtube_id: YOUTUBE.showreel, film_youtube_id: YOUTUBE.film, privacy_status: "provisional" } }];
    case "page_seo":
      return Object.keys(PAGE_SEO_PATHS).map((slug, i) => ({ slug, title: PAGE_TITLES[slug] ?? slug, sort_order: (i + 1) * 10, featured: false, data: PAGE_DESCRIPTIONS[slug] ? { seo_description: PAGE_DESCRIPTIONS[slug] } : {} }));
    default:
      return []; // testimonials (samples are never imported), articles, roles and FAQs start empty
  }
}

export const canImport = (type: ContentType) => seedItems(type).length > 0;
export const importableTypes = () => CONTENT_TYPES.filter(canImport);
