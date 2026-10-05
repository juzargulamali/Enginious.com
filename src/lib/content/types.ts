import type { Project } from "@/content/projects";
import type { Technology } from "@/content/technologies";
import type { Person } from "@/content/team";
import type { LeaderInfo } from "@/content/leaders";
import type { Client } from "@/content/clients";
import type { Testimonial } from "@/content/testimonials";
import type { Region, RegionKey } from "@/content/site";
import type { ImageAsset } from "@/content/images";
import type { ContentType } from "@/lib/cms/schema";

export interface SeoFields {
  title?: string;
  description?: string;
  image?: string; // media id
  canonical?: string;
  noindex?: boolean;
}

export interface SiteSettings {
  companyName: string;
  tagline?: string;
  contactEmail: string;
  contactPhone: string;
  social: { linkedin?: string; instagram?: string; x?: string; youtube?: string };
  footerText?: string;
  defaultSeo: SeoFields;
  /** Media id of the approved company-profile PDF. The download shows only when set. */
  companyProfile?: string;
  /** Public URL of the profile PDF, resolved from the media library. */
  companyProfileUrl?: string;
  showreelYoutubeId?: string;
  filmYoutubeId?: string;
  showreelMp4Url?: string;
  showreelPoster?: string;
  privacyStatus: "provisional" | "approved";
}

export interface Faq { slug: string; question: string; answer: string; category?: string; order: number }
export interface Solution { slug: string; title: string; summary: string; body?: string; benefits: string[]; process: { title: string; body?: string }[]; technologies: string[]; projects: string[]; media: string[]; order: number; featured: boolean }
export interface Article { slug: string; title: string; excerpt: string; body: string; category?: string; author?: string; publishedOn?: string; cover?: string; technologies: string[]; projects: string[]; featured: boolean; seo: SeoFields; updatedAt?: string }
export interface JobRole { slug: string; title: string; department?: string; location: string; employmentType?: string; description: string; requirements?: string; applyUrl?: string; applyEmail?: string; closesOn?: string; order: number; seo: SeoFields; publishedAt?: string }
export interface CompanySection { slug: string; title: string; body: string; steps: { title: string; body?: string }[] }

export interface RegionContent extends Region {
  /** Contact-page card: optional title, subtitle and photograph (media id) from the CMS. */
  cardTitle?: string;
  cardSubtitle?: string;
  cardImage?: string;
  intro?: string;
  address?: string;
  capabilities: string[];
  projects: string[];
}

export interface SiteContent {
  /** "cms" for each type the CMS is authoritative for; "static" for built-in starter content. */
  sources: Record<ContentType, "cms" | "static">;
  projects: Project[];
  technologies: Technology[];
  people: Person[];
  leaders: Record<string, LeaderInfo>;
  clients: Client[];
  testimonials: Testimonial[];
  regions: Record<RegionKey, RegionContent>;
  settings: SiteSettings;
  faqs: Faq[];
  solutions: Solution[];
  articles: Article[];
  roles: JobRole[];
  company: Record<string, CompanySection>;
  pageSeo: Record<string, SeoFields>;
  images: Record<string, ImageAsset>;
  /** Image slots chosen in the CMS (slot name -> media id). Empty = use the built-in defaults. */
  slots: Record<string, string>;
}

export interface PublishedRow {
  item_id: string;
  type: ContentType;
  locale: string;
  slug: string;
  title: string;
  data: Record<string, unknown>;
  sort_order: number;
  featured: boolean;
  version: number;
  published_at: string;
}

export interface MediaRow {
  id: string;
  kind: string;
  status: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  focal_x: number;
  focal_y: number;
  alt: string;
  caption?: string | null;
  credit?: string | null;
  source_url?: string | null;
  licence?: string | null;
  mime?: string | null;
  variants?: number[] | null;
  visibility: string;
}

export type { Project, Technology, Person, LeaderInfo, Client, Testimonial, Region, RegionKey, ImageAsset };
