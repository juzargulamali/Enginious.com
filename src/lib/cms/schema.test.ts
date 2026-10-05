import test from "node:test";
import assert from "node:assert/strict";
import { cleanData, slugify, TYPE_DEFS, validateForPublish, CONTENT_TYPES } from "./schema.ts";

test("every content type's schema is internally consistent (internal fields start with _)", () => {
  for (const t of CONTENT_TYPES) assert.doesNotThrow(() => cleanData(TYPE_DEFS[t], {}), t);
});

test("unknown keys are dropped, so editors cannot smuggle internal flags into other types", () => {
  const { data } = cleanData(TYPE_DEFS.project, { summary: "Hi there.", _permission_confirmed: true, evil: "x", _sample: true });
  assert.deepEqual(Object.keys(data), ["summary"]);
});

test("format problems are reported per field", () => {
  const { errors } = cleanData(TYPE_DEFS.region, { email: "not-an-email" });
  assert.ok(errors.email);
  const c = cleanData(TYPE_DEFS.article, { seo_canonical: "//evil.example" });
  assert.ok(c.errors.seo_canonical);
  const u = cleanData(TYPE_DEFS.client, { website: "javascript:alert(1)" });
  assert.ok(u.errors.website);
  const h = cleanData(TYPE_DEFS.setting, { redirect_hosts: ["good.example", "bad host!"] });
  assert.ok(h.errors.redirect_hosts);
});

test("testimonials cannot be published without permission or when they are samples", () => {
  const def = TYPE_DEFS.testimonial;
  const base = { quote: "A long enough quote here.", speaker_name: "A", speaker_role: "B", organisation: "C" };
  assert.ok(validateForPublish(def, "t", base)._permission_confirmed);
  assert.ok(validateForPublish(def, "t", { ...base, _permission_confirmed: true, _sample: true })._sample);
  assert.deepEqual(validateForPublish(def, "t", { ...base, _permission_confirmed: true }), {});
});

test("a direct or agency client needs approval and approved wording; an unconfirmed one does not", () => {
  const def = TYPE_DEFS.client;
  assert.deepEqual(validateForPublish(def, "C", { relationship: "unconfirmed" }), {});
  const e = validateForPublish(def, "C", { relationship: "direct" });
  assert.ok(e._relationship_approved && e.attribution);
  assert.deepEqual(validateForPublish(def, "C", { relationship: "agency", _relationship_approved: true, attribution: "Delivered through Agency X" }), {});
});

test("unverified outcomes and unconfirmed specifications block publishing", () => {
  assert.ok(validateForPublish(TYPE_DEFS.project, "P", { summary: "s", outcomes: [{ label: "Visitors", value: "10,000" }] })["outcomes.0.verified"]);
  assert.deepEqual(validateForPublish(TYPE_DEFS.project, "P", { summary: "s", outcomes: [{ label: "Visitors", value: "10,000", verified: true }] }), {});
  assert.ok(validateForPublish(TYPE_DEFS.technology, "T", { summary: "s", category: "kinetic", specs: [{ label: "Width", value: "3 m" }] })["specs.0.confirmed"]);
});

test("roles need an application route; people need role and department", () => {
  assert.ok(validateForPublish(TYPE_DEFS.role, "R", { location: "Dubai", description: "d" }).apply_url);
  assert.deepEqual(validateForPublish(TYPE_DEFS.role, "R", { location: "Dubai", description: "d", apply_email: "a@b.co" }), {});
  const p = validateForPublish(TYPE_DEFS.person, "P", {});
  assert.ok(p.role && p.department);
});

test("slugs are normalised to safe URL parts", () => {
  assert.equal(slugify("World Health Expo (WHX) 2026!"), "world-health-expo-whx-2026");
  assert.equal(slugify("Café & Résumé"), "cafe-and-resume");
  assert.equal(slugify("../../etc"), "etc");
});

test("technology showroom fields: size and offset are range-checked, media ids are kept", () => {
  const ok = cleanData(TYPE_DEFS.technology, { showcase_image: "pose-1", showcase_animation: "anim-1", showcase_scale: 110, showcase_y: -5 });
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.data.showcase_scale, 110);
  assert.equal(ok.data.showcase_animation, "anim-1");
  assert.ok(cleanData(TYPE_DEFS.technology, { showcase_scale: 400 }).errors.showcase_scale);
  assert.ok(cleanData(TYPE_DEFS.technology, { showcase_y: -90 }).errors.showcase_y);
});
