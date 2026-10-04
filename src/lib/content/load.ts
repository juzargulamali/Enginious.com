import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabaseAnon } from "@/lib/supabase/server";
import { assemble } from "./assemble";
import type { ContentType } from "@/lib/cms/schema";
import type { MediaRow, PublishedRow, SiteContent } from "./types";

/**
 * The public site's content, from the CMS (published snapshots only, read with the anon key through RLS) merged with the
 * built-in starter content for any type the CMS has not taken over yet. Cached with the tag "content": publishing,
 * unpublishing or archiving in /admin expires it immediately; otherwise it is refreshed every 5 minutes.
 * If the database is unreachable the starter content is served, so the public site never breaks.
 */
const MEDIA_COLUMNS = "id,kind,status,storage_path,width,height,focal_x,focal_y,alt,caption,credit,source_url,licence,mime,variants,visibility";

const fetchRaw = unstable_cache(
  async (): Promise<{ rows: PublishedRow[]; initialised: ContentType[]; media: MediaRow[] } | null> => {
    const sb = supabaseAnon();
    if (!sb) return null;
    try {
      const [pub, init, media] = await Promise.all([
        sb.from("content_published").select("item_id,type,locale,slug,title,data,sort_order,featured,version,published_at").limit(5000),
        sb.rpc("cms_type_initialised"),
        sb.from("media_assets").select(MEDIA_COLUMNS).limit(2000),
      ]);
      if (pub.error || init.error) return null;
      return { rows: (pub.data ?? []) as PublishedRow[], initialised: (init.data ?? []) as ContentType[], media: (media.data ?? []) as MediaRow[] };
    } catch {
      return null;
    }
  },
  ["site-content-v1"],
  { tags: ["content"], revalidate: 300 },
);

export const getContent = cache(async (): Promise<SiteContent> => {
  const raw = await fetchRaw();
  return assemble(raw?.rows ?? [], new Set(raw?.initialised ?? []), raw?.media ?? []);
});

export const bySlug = <T extends { slug: string }>(list: T[], slug: string) => list.find((x) => x.slug === slug);
