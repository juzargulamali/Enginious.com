import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { assertStaff, AuthError } from "@/lib/cms/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { checkPdf, MAX_UPLOAD_BYTES, processImage, UploadError } from "@/lib/cms/media-process";
import { formatBytes, hasBlockedExtension, safeDisplayName } from "@/lib/upload";
import { slugify } from "@/lib/cms/schema";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const STATUSES = ["real", "stock", "preview-portrait", "concept", "fictional-portrait"];
const KINDS = ["scene", "portrait", "logo", "document"];

/**
 * Upload to the media library. Staff only (checked here AND by RLS/storage policies, because every storage and database call
 * below runs as the signed-in user, not with the service key). Validates by file signature, re-encodes images (removing metadata
 * and any embedded payload), writes only to random generated paths, and keeps originals in the private bucket.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return json({ error: "Forbidden." }, 403);
  try { await assertStaff(); } catch (e) { return json({ error: e instanceof AuthError && e.kind === "forbidden" ? "Forbidden." : "Your session has expired. Sign in again." }, e instanceof AuthError && e.kind === "forbidden" ? 403 : 401); }
  if (Number(request.headers.get("content-length") ?? "0") > MAX_UPLOAD_BYTES + 256 * 1024) return json({ error: `Files can be at most ${formatBytes(MAX_UPLOAD_BYTES)}. Export a smaller version (about 2400 px wide is plenty).` }, 413);

  let form: FormData;
  try { form = await request.formData(); } catch { return json({ error: "The upload could not be read." }, 400); }
  const file = form.get("file");
  if (!file || typeof file === "string") return json({ error: "Choose a file." }, 400);
  if (file.size === 0) return json({ error: "That file is empty." }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.` }, 413);
  if (hasBlockedExtension(file.name)) return json({ error: "This file type is not allowed. Use JPEG, PNG or WebP images, or PDF documents." }, 415);

  const field = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const kind = field("kind", 20);
  const status = field("status", 30);
  const alt = field("alt", 300);
  const visibility = field("visibility", 10) === "private" ? "private" : "public";
  if (!KINDS.includes(kind)) return json({ error: "Choose what kind of media this is." }, 400);
  if (!STATUSES.includes(status)) return json({ error: "Choose a status (real, stock, concept ...)." }, 400);
  if (kind !== "document" && !alt) return json({ error: "Add alt text describing the image." }, 400);
  const sourceUrl = field("source_url", 500);
  if (sourceUrl && !/^https?:\/\/[^\s]+$/.test(sourceUrl)) return json({ error: "The source must be a web address starting with http:// or https://." }, 400);
  const fx = Math.min(1, Math.max(0, Number(form.get("focal_x") ?? 0.5) || 0.5));
  const fy = Math.min(1, Math.max(0, Number(form.get("focal_y") ?? 0.5) || 0.5));

  const sb = await supabaseUser();
  if (!sb) return json({ error: "The CMS is not connected to its database." }, 503);
  const buf = Buffer.from(await file.arrayBuffer());
  const title = field("title", 200) || safeDisplayName(file.name).replace(/\.[^.]+$/, "");
  const idBase = slugify(title).slice(0, 60) || (kind === "document" ? "document" : "image");
  const id = `${idBase}-${randomUUID().slice(0, 6)}`;
  const stored: { bucket: string; path: string }[] = [];
  const cleanup = async () => { for (const s of stored) await sb.storage.from(s.bucket).remove([s.path]); };
  const put = async (bucket: string, path: string, data: Buffer, contentType: string) => {
    const { error } = await sb.storage.from(bucket).upload(path, data, { contentType, upsert: false, cacheControl: "31536000" });
    if (error) throw new UploadError("The file could not be stored. You may not have permission, or storage is unavailable.");
    stored.push({ bucket, path });
  };

  try {
    let row: Record<string, unknown>;
    if (kind === "document") {
      checkPdf(buf);
      const bucket = visibility === "private" ? "private" : "documents";
      const path = `docs/${randomUUID()}.pdf`;
      await put(bucket, path, buf, "application/pdf");
      row = { id, kind, status, published: field("published", 5) !== "false", storage_path: path, width: null, height: null, alt: alt || title, title, mime: "application/pdf", bytes: buf.length, original_name: safeDisplayName(file.name), visibility, variants: [] };
    } else {
      const img = await processImage(buf);
      const bucket = visibility === "private" ? "private" : "media";
      const base = `images/${img.uuid}/img`;
      for (const v of img.variants) await put(bucket, `${base}-${v.width}.webp`, v.data, "image/webp");
      const originalPath = `originals/${img.uuid}.${img.original.ext}`;
      await put("private", originalPath, img.original.data, img.original.type);
      row = { id, kind, status, published: field("published", 5) !== "false", storage_path: base, width: img.width, height: img.height, focal_x: fx, focal_y: fy, alt, title, caption: field("caption", 400) || null, credit: field("credit", 200) || null, source_url: sourceUrl || null, licence: field("licence", 200) || null, mime: "image/webp", bytes: img.variants[img.variants.length - 1].data.length, original_name: safeDisplayName(file.name), visibility, variants: img.variants.map((v) => v.width), original_path: originalPath };
    }
    const { error } = await sb.from("media_assets").insert(row);
    if (error) { await cleanup(); return json({ error: error.code === "42501" ? "You do not have permission to add media." : "The media could not be saved. Please try again." }, error.code === "42501" ? 403 : 500); }
    revalidateTag("content", { expire: 0 }); // route handlers cannot use updateTag; expire immediately
    return json({ ok: true, id, width: row.width ?? null, height: row.height ?? null }, 201);
  } catch (e) {
    await cleanup();
    if (e instanceof UploadError) return json({ error: e.message }, 400);
    console.error("media upload failed:", e instanceof Error ? `${e.name}: ${e.message}` : "unknown"); // no file names or user data
    return json({ error: "The upload failed. Please try again." }, 500);
  }
}
