import "server-only";
import type { Metadata } from "next";
import { getContent } from "@/lib/content/load";
import { indexingAllowed } from "./indexing";
import type { ImageAsset } from "@/content/images";
import type { SeoFields } from "@/lib/content/types";

export interface MetaInput {
  /** Path of the page, e.g. "/work/whx". Used for the canonical URL unless the CMS overrides it. */
  path: string;
  /** Fallbacks (in code) used when neither the page's own SEO nor the CMS page settings provide a value. */
  title?: string;
  description?: string;
  /** The page's own SEO fields (project, article, ...). */
  seo?: SeoFields;
  /** Key of a page_seo item for fixed pages ("home", "work", ...). */
  pageKey?: string;
  type?: "website" | "article";
  /** Media id of an image that represents the page (e.g. a project cover) used when no sharing image is set. */
  image?: string;
  publishedTime?: string;
}

const largest = (a: ImageAsset) => `${a.src}-${a.widths[a.widths.length - 1]}.webp`;

/**
 * One place that turns CMS fields into <head> metadata, with consistent fallbacks:
 *   page SEO fields -> CMS "page search settings" -> code fallback -> site default.
 * Canonical URLs are relative to metadataBase, which is the configured public production origin (see lib/seo/indexing.ts).
 */
export async function buildMetadata(input: MetaInput): Promise<Metadata> {
  const c = await getContent();
  const page = input.pageKey ? c.pageSeo[input.pageKey] : undefined;
  const def = c.settings.defaultSeo;
  const title = input.seo?.title ?? page?.title ?? input.title ?? def.title;
  const description = input.seo?.description ?? page?.description ?? input.description ?? def.description;
  const imageId = input.seo?.image ?? page?.image ?? input.image ?? def.image;
  const image = imageId ? c.images[imageId] : undefined;
  const canonical = input.seo?.canonical ?? page?.canonical ?? input.path;
  const noindex = input.seo?.noindex === true || page?.noindex === true;
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical },
    openGraph: {
      siteName: c.settings.companyName,
      type: input.type ?? "website",
      url: canonical,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(image ? { images: [{ url: largest(image), width: image.width, height: image.height, alt: image.alt }] } : {}),
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", ...(title ? { title } : {}), ...(description ? { description } : {}), ...(image ? { images: [largest(image)] } : {}) },
    // Per-page noindex only ever ADDS restriction; the global preview/launch rules in the root layout still apply.
    ...(noindex || !indexingAllowed() ? { robots: { index: false, follow: false } } : {}),
  };
}
