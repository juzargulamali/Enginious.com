// Media library end to end (LOCAL stand-in with real storage policies): validation, derivatives, privacy, selection in editors,
// public delivery, and delete protection.
const { chromium } = require("playwright");
const sharp = require("sharp");
const { reviewAndPublish } = require("./lib-adopt.cjs");
const BASE = process.argv[2] || "http://localhost:3300";
const MOCK = "http://127.0.0.1:54321";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log("  PASS " + name); } else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); } };
const sql = (q) => require("child_process").execFileSync("psql", ["-h", "/var/tmp/pgtest", "-p", "54329", "-U", "postgres", "-d", "enginious_test", "-At", "-c", q]).toString().trim();

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/admin/login", { waitUntil: "load" }); await p.fill("#email", "editor@test.local"); await p.fill("#password", "correct-horse-battery"); await p.click('button[type="submit"]'); await p.waitForURL(/\/admin\/?$/);

  const big = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: { r: 20, g: 120, b: 140 } } }).composite([{ input: await sharp({ create: { width: 800, height: 400, channels: 3, background: "#ffffff" } }).png().toBuffer(), left: 300, top: 200 }]).jpeg({ quality: 82 }).toBuffer();
  const small = await sharp({ create: { width: 700, height: 500, channels: 3, background: "#aa3366" } }).png().toBuffer();
  const pdfOk = Buffer.from("%PDF-1.4\n1 0 obj<< /Type /Catalog >>endobj\ntrailer<< /Root 1 0 R >>\n%%EOF\n");
  const pdfJs = Buffer.from("%PDF-1.4\n1 0 obj<< /Type /Catalog /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>endobj\n%%EOF\n");

  const upload = async (file, { kind = "scene", status = "concept", alt = "A test image", visibility = "public" } = {}) => {
    await p.goto(BASE + "/admin/media", { waitUntil: "load" });
    await p.selectOption("#up-kind", kind); await p.selectOption("#up-status", status); await p.selectOption("#up-vis", visibility);
    await p.fill("#up-alt", alt);
    await p.locator("#up-file").setInputFiles(file);
    await p.getByRole("button", { name: "Upload", exact: true }).click();
    await sleep(2500);
  };

  // ---- refused uploads
  await upload({ name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>") });
  ok("an SVG upload is refused", /not allowed|Only JPEG|SVG/i.test(await p.locator("body").innerText()));
  await upload({ name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("MZ\u0090\u0000this is an executable pretending to be a photo") });
  ok("an executable renamed .jpg is refused by its signature", /could not be read|Only JPEG, PNG and WebP/i.test(await p.locator("body").innerText()), (await p.locator(".adm-alert").allInnerTexts()).join("|"));
  await upload({ name: "huge.png", mimeType: "image/png", buffer: Buffer.concat([small, Buffer.alloc(4.3 * 1024 * 1024)]) });
  ok("a file over the limit is refused with the limit stated", /4(\.0)? MB|too large/i.test(await p.locator("body").innerText()));
  await p.goto(BASE + "/admin/media", { waitUntil: "load" });
  await p.selectOption("#up-kind", "scene"); await p.fill("#up-alt", ""); await p.locator("#up-file").setInputFiles({ name: "x.png", mimeType: "image/png", buffer: small });
  await p.getByRole("button", { name: "Upload", exact: true }).click(); await sleep(1500);
  ok("alt text is required for images", /Add alt text/i.test(await p.locator("body").innerText()));
  await upload({ name: "evil.pdf", mimeType: "application/pdf", buffer: pdfJs }, { kind: "document", status: "real", alt: "Evil" });
  ok("a PDF containing scripts is refused", /scripts or launch actions/i.test(await p.locator("body").innerText()));
  await p.goto(BASE + "/admin/media", { waitUntil: "load" });
  ok("nothing was stored for any refused upload", sql("select count(*) from media_assets") === "0" && sql("select count(*) from storage.objects") === "0");

  // ---- a valid large image: responsive derivatives only
  await upload({ name: "stand.jpg", mimeType: "image/jpeg", buffer: big }, { alt: "A kinetic stand on an exhibition floor", status: "concept" });
  await p.waitForURL(/\/admin\/media\/[a-z0-9-]+$/, { timeout: 15000 }).catch(() => {});
  const id1 = p.url().split("/").pop();
  ok("a valid image uploads and opens its detail page", /\/admin\/media\/stand-[a-z0-9]{6}$/.test(p.url()), p.url());
  const row = sql(`select width || 'x' || height || '|' || variants::text || '|' || visibility || '|' || storage_path from media_assets where id = '${id1}'`).split("|");
  ok("original dimensions are recorded and derivatives are 480, 960 and 1600 px", row[0] === "2400x1600" && row[1] === "{480,960,1600}", row.join(" "));
  const base = `${MOCK}/storage/v1/object/public/media/${row[3]}`;
  const sizes = [];
  for (const w of [480, 960, 1600]) { const r = await fetch(`${base}-${w}.webp`); const buf = Buffer.from(await r.arrayBuffer()); const m = await sharp(buf).metadata(); sizes.push([r.status, m.format, m.width]); }
  ok("the public derivatives are WebP at the stated widths (never the 2400 px original)", sizes.every(([s, f]) => s === 200 && f === "webp") && sizes[0][2] === 480 && sizes[1][2] === 960 && sizes[2][2] === 1600, JSON.stringify(sizes));
  const origs = sql("select name from storage.objects where bucket_id = 'private'");
  ok("the original is kept in the PRIVATE bucket only", /originals\//.test(origs) && (await fetch(`${MOCK}/storage/v1/object/public/private/${origs.split("\n")[0]}`)).status !== 200);
  ok("exif/metadata is stripped (re-encoded)", !(await sharp(Buffer.from(await (await fetch(`${base}-1600.webp`)).arrayBuffer())).metadata()).exif);

  // ---- small image: no upscaling
  await upload({ name: "small.png", mimeType: "image/png", buffer: small }, { alt: "A small test image", status: "preview-portrait", kind: "portrait" });
  await p.waitForURL(/\/admin\/media\/small-/, { timeout: 15000 }).catch(() => {});
  const id2 = p.url().split("/").pop();
  ok("small images are not upscaled (variants stop at the original width)", sql(`select variants::text from media_assets where id = '${id2}'`) === "{480,700}");

  // ---- metadata editing, focal point
  await p.goto(`${BASE}/admin/media/${id1}`, { waitUntil: "load" });
  await p.locator('div[role="presentation"] img').click({ position: { x: 100, y: 60 } });
  await p.fill("#m-credit", "Test Studio"); await p.fill("#m-licence", "Supplied for testing"); await p.fill("#m-cap", "A caption");
  await p.getByRole("button", { name: "Save changes" }).click(); await sleep(1500);
  const meta = sql(`select credit || '|' || licence || '|' || caption || '|' || (focal_x < 0.5)::text || '|' || (focal_y < 0.5)::text from media_assets where id = '${id1}'`);
  ok("alt, credit, licence, caption and focal point are saved", meta === "Test Studio|Supplied for testing|A caption|true|true", meta);
  await p.fill("#m-alt", ""); await p.getByRole("button", { name: "Save changes" }).click(); await sleep(1200);
  ok("clearing the alt text of an image is refused", /Alt text is required/i.test(await p.locator("body").innerText()));
  await p.goto(`${BASE}/admin/media/${id1}`, { waitUntil: "load" });

  // ---- documents and private media
  await upload({ name: "profile.pdf", mimeType: "application/pdf", buffer: pdfOk }, { kind: "document", status: "real", alt: "Company profile 2026" });
  await p.waitForURL(/\/admin\/media\/profile-/, { timeout: 15000 }).catch(() => {});
  const docId = p.url().split("/").pop();
  ok("a plain PDF is accepted as a document", sql(`select kind || '|' || visibility from media_assets where id = '${docId}'`) === "document|public");
  await upload({ name: "secret.jpg", mimeType: "image/jpeg", buffer: big }, { alt: "Confidential render", status: "real", visibility: "private" });
  await p.waitForURL(/\/admin\/media\/secret-/, { timeout: 15000 }).catch(() => {});
  const privId = p.url().split("/").pop();
  const prow = sql(`select storage_path from media_assets where id = '${privId}'`);
  ok("private media has NO public derivatives", (await fetch(`${MOCK}/storage/v1/object/public/media/${prow}-960.webp`)).status !== 200 && (await fetch(`${MOCK}/storage/v1/object/public/private/${prow}-960.webp`)).status !== 200);
  ok("staff can still preview private media (signed link)", (await p.locator('div[role="presentation"] img').count()) === 1);
  const keys = await (await fetch(MOCK + "/__mock/keys")).json();
  const anonList = await (await fetch(`${MOCK}/rest/v1/media_assets?select=id`, { headers: { apikey: keys.anon, Authorization: `Bearer ${keys.anon}` } })).json();
  ok("the public database API lists only published public media (not the private asset)", Array.isArray(anonList) && !anonList.some((m) => m.id === privId) && anonList.some((m) => m.id === id1));

  // ---- choose media in editors; public delivery with labels
  await p.goto(BASE + "/admin/content/setting", { waitUntil: "load" });
  p.once("dialog", (d) => d.accept()); await p.getByRole("button", { name: "Import starter content as drafts" }).click(); await p.waitForSelector("table.adm-table");
  { const actx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const ap = await actx.newPage();
    await ap.goto(BASE + "/admin/login", { waitUntil: "load" }); await ap.fill("#email", "admin@test.local"); await ap.fill("#password", "correct-horse-battery"); await ap.click('button[type="submit"]'); await ap.waitForURL(/\/admin\/?$/);
    await reviewAndPublish(ap, BASE, "setting"); await actx.close(); }
  await p.goto(BASE + "/admin/content/setting", { waitUntil: "load" });
  await p.locator("table.adm-table a.t", { hasText: "Site settings" }).first().click(); await p.waitForSelector("#ed-title");
  await p.locator('[data-field="company_profile"]').getByRole("button", { name: /^Choose / }).click();
  await p.getByRole("dialog").getByRole("button", { name: /Company profile 2026/ }).click();
  await p.locator('[data-field="slot_cap_events"]').getByRole("button", { name: /^Choose / }).click();
  ok("the picker offers images for image fields and documents only for document fields", (await p.getByRole("dialog").getByRole("button", { name: /Company profile 2026/ }).count()) === 0 && (await p.getByRole("dialog").getByRole("button", { name: /kinetic stand/ }).count()) === 1);
  await p.getByRole("dialog").getByRole("button", { name: /kinetic stand/ }).click();
  await p.getByRole("button", { name: /Save and (publish|update live page)/ }).click();
  await p.waitForFunction(() => /Published\. The public page/.test(document.body.innerText), null, { timeout: 20000 });
  await sleep(800);
  const home = await (await fetch(BASE + "/")).text();
  const profileLink = /href="([^"]*\/documents\/docs\/[^"]+\.pdf)"/.exec(home);
  ok("the footer offers the company profile download only once a PDF is chosen", !!profileLink && /Company profile \(PDF\)/.test(home));
  ok("the profile link serves the PDF", profileLink && (await fetch(profileLink[1])).headers.get("content-type") === "application/pdf");
  ok("the capability card shows the chosen image with srcset and an 'Illustrative image' label", /srcSet="[^"]*-480\.webp 480w[^"]*-960\.webp 960w/i.test(home.replace(/srcset=/g, "srcSet=")) && /Illustrative image/.test(home));

  // ---- delete protection
  await p.goto(`${BASE}/admin/media/${id1}`, { waitUntil: "load" });
  ok("media used by live content cannot be deleted (button disabled, reason shown)", (await p.getByRole("button", { name: "Delete media" }).isDisabled()) && /live on the site|Remove it from the drafts/.test(await p.locator("body").innerText()));
  await p.goto(`${BASE}/admin/media/${privId}`, { waitUntil: "load" });
  p.once("dialog", (d) => d.accept()); await p.getByRole("button", { name: "Delete media" }).click(); await p.waitForURL(/\/admin\/media$/, { timeout: 15000 });
  ok("unreferenced media deletes, along with its files", sql(`select count(*) from media_assets where id = '${privId}'`) === "0" && sql(`select count(*) from storage.objects where name like '%${prow.split("/")[1]}%' and bucket_id = 'private'`) === "0");

  await p.goto(BASE + "/admin/media", { waitUntil: "load" });
  await p.screenshot({ path: "/tmp/claude-0/adm/media-library.png" });
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
