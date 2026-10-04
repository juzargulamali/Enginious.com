import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnquiry, makeReference } from "./enquiry.ts";

const good = {
  submissionId: "3f1c2b6e-8a44-4c0e-9a77-0d9f2d5b1a10",
  region: "europe",
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "We are planning an exhibition stand in Warsaw.",
  technologies: ["tri-helix", "tri-helix", "touch-and-throw"],
};

test("accepts a valid enquiry and de-duplicates technologies", () => {
  const r = parseEnquiry(good);
  assert.ok(r.ok && !r.honeypot);
  if (r.ok && !r.honeypot) assert.deepEqual(r.value.technologies, ["tri-helix", "touch-and-throw"]);
});

test("requires name, email, message and a team", () => {
  const r = parseEnquiry({ submissionId: good.submissionId });
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.errors).sort(), ["email", "message", "name", "region"]);
});

test("rejects bad email, short message, bad enums and slugs", () => {
  const r = parseEnquiry({ ...good, email: "nope", message: "hi", budget: "free", technologies: ["../x"] });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.ok(r.errors.email && r.errors.message && r.errors.budget && r.errors.technologies);
  }
});

test("honeypot short-circuits without errors", () => {
  const r = parseEnquiry({ ...good, website: "http://spam" });
  assert.deepEqual(r, { ok: true, honeypot: true });
});

test("rejects oversize message and non-objects", () => {
  assert.equal(parseEnquiry({ ...good, message: "x".repeat(5001) }).ok, false);
  assert.equal(parseEnquiry(null).ok, false);
  assert.equal(parseEnquiry("str").ok, false);
});

test("reference format", () => {
  const ref = makeReference((n) => new Uint8Array(n).map((_, i) => i * 7));
  assert.match(ref, /^ENQ-[A-Z2-9]{8}$/);
});
