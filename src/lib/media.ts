// Where media is served from, and how responsive URLs are built. Pure helpers (usable on server and client).

export const MEDIA_WIDTHS = [480, 960, 1600] as const;

const base = () => (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");

/** Public URL of an object in a public bucket. */
export const publicUrl = (bucket: "media" | "documents", path: string) => `${base()}/storage/v1/object/public/${bucket}/${path}`;

export interface MediaLike { storage_path: string; variants?: number[] | null; kind?: string; visibility?: string }

/** Responsive derivative URL (e.g. images/<uuid>/img-960.webp). Never the original. */
export function variantUrl(m: MediaLike, width: number): string {
  const widths = (m.variants && m.variants.length ? m.variants : [...MEDIA_WIDTHS]).slice().sort((a, b) => a - b);
  const w = widths.find((x) => x >= width) ?? widths[widths.length - 1];
  return publicUrl("media", `${m.storage_path}-${w}.webp`);
}
export function srcSet(m: MediaLike): string {
  const widths = (m.variants && m.variants.length ? m.variants : [...MEDIA_WIDTHS]);
  return widths.map((w) => `${publicUrl("media", `${m.storage_path}-${w}.webp`)} ${w}w`).join(", ");
}
