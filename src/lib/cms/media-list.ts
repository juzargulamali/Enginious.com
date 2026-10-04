import "server-only";
import { supabaseUser } from "@/lib/supabase/server";
import { IMAGES } from "@/content/images";
import { variantUrl } from "@/lib/media";
import type { MediaOption } from "@/components/admin/fields/types";

/** Media the editors can pick from: the library (RLS: staff see everything) plus the built-in registered photos. */
export async function listMediaOptions(): Promise<MediaOption[]> {
  const sb = await supabaseUser();
  const out: MediaOption[] = [];
  if (sb) {
    const { data } = await sb.from("media_assets").select("id,kind,status,alt,title,storage_path,variants,visibility").order("created_at", { ascending: false }).limit(500);
    for (const m of (data ?? []) as { id: string; kind: string; status: string; alt: string; title: string | null; storage_path: string; variants: number[] | null; visibility: string }[]) {
      out.push({ id: m.id, alt: m.alt, kind: m.kind, status: m.status, visibility: m.visibility, title: m.title ?? "", thumb: m.kind === "document" || m.visibility !== "public" ? null : variantUrl(m, 480) });
    }
  }
  for (const a of Object.values(IMAGES)) {
    if (out.some((o) => o.id === a.id)) continue;
    out.push({ id: a.id, alt: a.alt, kind: a.kind, status: a.status, visibility: "public", title: "Built-in", thumb: `${a.src}-${a.widths[0]}.webp` });
  }
  return out;
}
