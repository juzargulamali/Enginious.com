import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/server";
import { checkLimits, clientIp } from "@/lib/rate-limit";
import { EXTENSION, formatBytes, hasBlockedExtension, safeDisplayName, sniffType } from "@/lib/upload";

export const dynamic = "force-dynamic";

// Private brief attachments. Files go to the PRIVATE "enquiry-attachments" bucket (never public); only staff can read them.
// Limits are set by the hosting platform's request-body cap (about 4.5 MB per request on Vercel), so we stay under it.
const MAX_FILES = 3;
const MAX_TOTAL = 4 * 1024 * 1024;
const WINDOW_MS = 30 * 60 * 1000; // attachments can be added for 30 minutes after the enquiry was stored

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return json({ error: "forbidden" }, 403);
  const length = Number(request.headers.get("content-length") ?? "0");
  if (!length) return json({ error: "length_required" }, 411); // chunked bodies would bypass the size cap
  if (length > MAX_TOTAL + 64 * 1024) return json({ error: "too_large", message: `Attachments can total at most ${formatBytes(MAX_TOTAL)}.` }, 413);

  const db = supabaseAdmin();
  if (!db) return json({ error: "unavailable" }, 503);

  // Rate limit BEFORE reading the body.
  const limited = await checkLimits([{ name: "enq-att-ip-hour", value: clientIp(request.headers), limit: 12, windowSeconds: 3600 }]);
  if (limited) return json({ error: "rate_limited" }, 429, { "Retry-After": String(limited.retryAfter) });

  let form: FormData;
  try { form = await request.formData(); } catch { return json({ error: "invalid_form" }, 400); }
  const reference = String(form.get("reference") ?? "");
  const submissionId = String(form.get("submissionId") ?? "");
  if (!/^ENQ-[A-Z0-9]{8}$/.test(reference) || !/^[0-9a-f-]{36}$/i.test(submissionId)) return json({ error: "invalid_request" }, 400);

  // Capability check: the caller must know both the reference and the secret submission id, shortly after submitting.
  const { data: enq } = await db.from("enquiries").select("id,created_at,attachment_count").eq("reference", reference).eq("submission_id", submissionId).maybeSingle();
  if (!enq || Date.now() - new Date(enq.created_at as string).getTime() > WINDOW_MS) return json({ error: "not_found" }, 404);

  const files = form.getAll("files").filter((f): f is File => typeof f === "object" && "arrayBuffer" in f && f.size > 0);
  if (!files.length) return json({ error: "no_files" }, 400);
  if (files.length + (enq.attachment_count as number) > MAX_FILES) return json({ error: "too_many", message: `You can attach at most ${MAX_FILES} files.` }, 400);
  if (files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL) return json({ error: "too_large", message: `Attachments can total at most ${formatBytes(MAX_TOTAL)}.` }, 413);

  // Reserve the slots atomically BEFORE storing anything (parallel requests cannot exceed the cap), release what is not used.
  const reserve = await db.from("enquiries").update({ attachment_count: (enq.attachment_count as number) + files.length }).eq("id", enq.id).eq("attachment_count", enq.attachment_count as number).select("id");
  if (reserve.error || !reserve.data?.length) return json({ error: "busy", message: "Please try again in a moment." }, 409);
  const results: { name: string; ok: boolean; error?: string }[] = [];
  let stored = 0;
  for (const f of files) {
    const name = safeDisplayName(f.name);
    if (hasBlockedExtension(f.name)) { results.push({ name, ok: false, error: "This file type is not accepted." }); continue; }
    const buf = new Uint8Array(await f.arrayBuffer());
    const type = sniffType(buf);
    if (!type) { results.push({ name, ok: false, error: "Only PDF, JPEG, PNG and WebP files are accepted." }); continue; }
    const path = `${enq.id}/${randomUUID()}.${EXTENSION[type]}`;
    const up = await db.storage.from("enquiry-attachments").upload(path, buf, { contentType: type, upsert: false });
    if (up.error) { results.push({ name, ok: false, error: "Could not store this file." }); continue; }
    const ins = await db.from("enquiry_attachments").insert({ enquiry_id: enq.id, storage_path: path, original_name: name, mime: type, bytes: buf.length });
    if (ins.error) { await db.storage.from("enquiry-attachments").remove([path]); results.push({ name, ok: false, error: "Could not record this file." }); continue; }
    stored++;
    results.push({ name, ok: true });
  }
  if (stored < files.length) await db.from("enquiries").update({ attachment_count: (enq.attachment_count as number) + stored }).eq("id", enq.id);
  return json({ ok: stored > 0, stored, results }, stored ? 201 : 400);
}
