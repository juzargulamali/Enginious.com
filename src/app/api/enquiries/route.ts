import { after, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { makeReference, parseEnquiry } from "@/lib/enquiry";
import { checkLimits, clientIp } from "@/lib/rate-limit";
import { notifyEnquiry } from "@/lib/enquiry-notify";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 20_000;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(request: Request) {
  // Same-origin only: blocks cross-site form posts.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return json({ error: "forbidden" }, 403);

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) return json({ error: "too_large" }, 413);

  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return json({ error: "too_large" }, 413);
    raw = JSON.parse(text);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const parsed = parseEnquiry(raw);
  if (!parsed.ok) return json({ error: "validation", errors: parsed.errors }, 400);
  // Bots filling the hidden field get an inert success; nothing is stored or sent.
  if (parsed.honeypot) return json({ ok: true, reference: "ENQ-00000000" });

  const db = supabaseAdmin();
  if (!db) return json({ error: "unavailable" }, 503);

  const v = parsed.value;
  // Persistent (database-backed) limits: per network address, and per email address, so a script cannot flood the inbox.
  const ip = clientIp(request.headers);
  const limited = await checkLimits([
    { name: "enq-ip-hour", value: ip, limit: 8, windowSeconds: 3600 },
    { name: "enq-ip-day", value: ip, limit: 30, windowSeconds: 86400 },
    { name: "enq-email-day", value: v.email.toLowerCase(), limit: 6, windowSeconds: 86400 },
  ]);
  if (limited) return json({ error: "rate_limited" }, 429, { "Retry-After": String(limited.retryAfter) });

  const sourcePath = typeof (raw as { sourcePath?: unknown }).sourcePath === "string"
    ? (raw as { sourcePath: string }).sourcePath.slice(0, 200)
    : null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const reference = makeReference((n) => crypto.getRandomValues(new Uint8Array(n)));
    const { data, error } = await db.from("enquiries").insert({
      reference,
      submission_id: v.submissionId,
      region: v.region,
      name: v.name,
      email: v.email,
      company: v.company,
      country: v.country,
      project_type: v.projectType,
      event_date: v.eventDate,
      budget: v.budget,
      message: v.message,
      technologies: v.technologies,
      source_path: sourcePath,
    }).select("id").single();

    if (!error && data) {
      // The enquiry is STORED. Notifying staff happens afterwards and can fail without affecting this response.
      after(() => notifyEnquiry(data.id as string));
      return json({ ok: true, reference }, 201);
    }

    if (error?.code === "23505") {
      // Duplicate submission (double click / retry): return the original reference.
      const { data: existing } = await db.from("enquiries").select("reference").eq("submission_id", v.submissionId).maybeSingle();
      if (existing?.reference) return json({ ok: true, reference: existing.reference, duplicate: true });
      continue; // reference collision: try a new one
    }
    console.error("enquiry insert failed", error?.code); // never log the message, name or email
    return json({ error: "unavailable" }, 503);
  }
  return json({ error: "unavailable" }, 503);
}
