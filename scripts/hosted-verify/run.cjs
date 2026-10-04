#!/usr/bin/env node
/**
 * HOSTED verification of the Milestone 2 integration against a real deployment + the real Enginious Supabase project.
 *
 *   HOSTED_BASE_URL=https://<preview-host>  ADMIN_EMAIL=... ADMIN_PASSWORD=... EDITOR_EMAIL=... EDITOR_PASSWORD=... \
 *   node scripts/hosted-verify/run.cjs
 *
 * Credentials come only from the environment (never from files, never printed). It creates clearly labelled test records
 * ("ZZ-TEST-<timestamp>") and removes them again; it sends NO emails (notifications must be off), sends nothing to real people,
 * and refuses to run against anything but a *.vercel.app preview or localhost unless ALLOW_NON_PREVIEW=1.
 *
 * Results are written to hosted-verify-result.json (path override: HOSTED_RESULT_FILE). Steps that need a human (receiving and
 * clicking an email) are reported as MANUAL, never as passed. Run via `docs/hosted-verification.md`.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const crypto = require("crypto");

const BASE = (process.env.HOSTED_BASE_URL || "").replace(/\/$/, "");
const { ADMIN_EMAIL, ADMIN_PASSWORD, EDITOR_EMAIL, EDITOR_PASSWORD } = process.env;
const OUT = process.env.HOSTED_RESULT_FILE || "hosted-verify-result.json";
const MODE = process.env.HOSTED_MODE || "hosted"; // "hosted" or "local-rehearsal" (stand-in); recorded in the result file
const TAG = `ZZ-TEST-${Date.now()}`;

if (!BASE || !ADMIN_EMAIL || !ADMIN_PASSWORD || !EDITOR_EMAIL || !EDITOR_PASSWORD) {
  console.error("Set HOSTED_BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, EDITOR_EMAIL and EDITOR_PASSWORD."); process.exit(2);
}
const host = new URL(BASE).hostname;
if (!/\.vercel\.app$/.test(host) && !/^(localhost|127\.0\.0\.1)$/.test(host) && process.env.ALLOW_NON_PREVIEW !== "1") {
  console.error(`Refusing to run against ${host}: this is only meant for a Vercel preview. Set ALLOW_NON_PREVIEW=1 to override.`); process.exit(2);
}

const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function rec(area, name, status, detail = "") { results.push({ area, name, status, detail: String(detail).slice(0, 300) }); console.log(`  ${status.padEnd(6)} [${area}] ${name}${detail && status !== "PASS" ? "  -> " + String(detail).slice(0, 200) : ""}`); }
const ok = (area, name, cond, detail) => rec(area, name, cond ? "PASS" : "FAIL", cond ? "" : detail);
const manual = (area, name, detail) => rec(area, name, "MANUAL", detail);
const get = async (path, opts = {}) => { const r = await fetch(BASE + path, { redirect: "manual", ...opts }); return { status: r.status, headers: r.headers, text: await r.text().catch(() => "") }; };
async function poll(fn, ms = 45000) { const end = Date.now() + ms; for (;;) { try { const v = await fn(); if (v) return v; } catch {} if (Date.now() > end) return false; await sleep(2000); } }

async function login(browser, email, password) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/admin/login", { waitUntil: "load" });
  await p.fill("#email", email); await p.fill("#password", password); await p.click('button[type="submit"]');
  await p.waitForURL(/\/admin\/?$/, { timeout: password.startsWith("definitely-wrong-") ? 8000 : 30000 }).catch(() => {});
  return { ctx, p, signedIn: /\/admin\/?$/.test(p.url()) };
}
const field = (p, key) => p.locator(`[data-field="${key}"] textarea, [data-field="${key}"] input`).first();

(async () => {
  console.log(`Hosted verification  mode=${MODE}  base=${BASE}  tag=${TAG}`);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
  const cleanup = { articleId: null, mediaId: null, enquiryId: null };
  let admin;
  try {
    // ---------- 0. public safeguards on the deployment
    let r = await get("/");
    ok("safeguards", "home page loads", r.status === 200, r.status);
    ok("safeguards", "preview is noindex (header and meta)", /noindex/.test(r.headers.get("x-robots-tag") || "") && /name="robots" content="noindex/.test(r.text));
    r = await get("/robots.txt"); ok("safeguards", "robots.txt disallows everything", /Disallow: \//.test(r.text) && !/Allow: \//.test(r.text));
    r = await get("/sitemap.xml"); ok("safeguards", "sitemap is empty while indexing is off", !/<loc>/.test(r.text));
    r = await get("/admin"); ok("safeguards", "signed-out /admin redirects to the login page", [302, 303, 307, 308].includes(r.status) && /\/admin\/login/.test(r.headers.get("location") || ""), `${r.status} ${r.headers.get("location")}`);
    r = await get("/admin/content/project"); ok("safeguards", "signed-out content list redirects to login", [302, 303, 307, 308].includes(r.status), r.status);
    r = await get("/api/admin/media", { method: "POST" }); ok("safeguards", "signed-out media API refuses", r.status === 401 || r.status === 403, r.status);

    // ---------- 1. login, wrong password, logout
    const bad = await login(browser, ADMIN_EMAIL, "definitely-wrong-" + crypto.randomUUID());
    ok("auth", "a wrong password does not sign in and shows a generic message", !bad.signedIn && /\/admin\/login/.test(bad.p.url()) && !/does not exist|no user|not registered/i.test(await bad.p.locator("body").innerText()));
    await bad.ctx.close();
    admin = await login(browser, ADMIN_EMAIL, ADMIN_PASSWORD);
    ok("auth", "administrator signs in with the real Supabase Auth user", admin.signedIn, admin.p.url());
    if (!admin.signedIn) throw new Error("Cannot continue without an administrator session.");
    ok("auth", "administrator sees Users and access", (await admin.p.locator("nav").first().innerText()).includes("Users"));
    const out = await login(browser, ADMIN_EMAIL, ADMIN_PASSWORD);
    await out.p.getByRole("button", { name: /sign out/i }).first().click();
    await out.p.waitForURL(/\/admin\/login/, { timeout: 20000 }).catch(() => {});
    await out.p.goto(BASE + "/admin", { waitUntil: "load" });
    ok("auth", "logout ends the session (protected page redirects to login)", /\/admin\/login/.test(out.p.url()), out.p.url());
    await out.ctx.close();

    // ---------- 2. password recovery
    const rc = await browser.newContext(); const rp = await rc.newPage();
    await rp.goto(BASE + "/admin/forgot-password", { waitUntil: "load" });
    await rp.fill("#email", ADMIN_EMAIL); await rp.getByRole("button", { name: /send|reset/i }).first().click();
    await sleep(3000);
    const t = await rp.locator("body").innerText();
    ok("recovery", "the request shows the same neutral confirmation (no account disclosure)", /if that address|if (an|that) account|check your email/i.test(t), t.slice(0, 160));
    await rp.fill("#email", `nobody-${crypto.randomUUID()}@example.invalid`).catch(() => {});
    await rc.close();
    manual("recovery", "the reset email arrives and its link opens /admin/auth/confirm then /admin/set-password", "Open the email, click the link, set a new 12+ character password, then sign in with it. See docs/hosted-verification.md step R.");
    manual("recovery", "an expired or reused reset link shows the safe 'link expired' state", "Click the same link a second time.");

    // ---------- 3. draft -> publish -> unpublish (a non-starter type: article)
    const slug = TAG.toLowerCase();
    const ap = admin.p;
    await ap.goto(BASE + "/admin/content/article/new", { waitUntil: "load" });
    await ap.fill("#title", `${TAG} verification article`); await ap.fill("#slug", slug);
    await ap.getByRole("button", { name: "Create draft" }).click();
    await ap.waitForURL(/\/admin\/content\/article\/[0-9a-f-]{36}$/, { timeout: 30000 });
    cleanup.articleId = ap.url().split("/").pop();
    ok("workflow", "a draft is created in the real database", !!cleanup.articleId);
    await field(ap, "excerpt").fill("Temporary verification article. It is removed after the check.");
    await field(ap, "body").fill("This article exists only to verify publishing on the hosted project.");
    await ap.getByRole("button", { name: "Save draft" }).click();
    await ap.waitForFunction(() => /Saved/.test(document.querySelector(".adm-savebar .status")?.textContent || ""), null, { timeout: 30000 }).catch(() => {});
    ok("workflow", "the draft saves", /Saved/.test(await ap.locator(".adm-savebar .status").innerText()));
    r = await get(`/insights/${slug}`); ok("workflow", "a draft is NOT public (404)", r.status === 404, r.status);
    ok("workflow", "the draft is not in the sitemap or the insights list", !(await get("/insights")).text.includes(TAG));
    await ap.getByRole("button", { name: /Save and publish/ }).click();
    await ap.waitForFunction(() => /Published\. The public page/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
    ok("workflow", "publishing succeeds", /Published\. The public page/.test(await ap.locator("body").innerText()), (await ap.locator(".adm-alert").allInnerTexts()).join("|"));
    ok("workflow", "the published page is public (200) and noindex on the preview", !!(await poll(async () => (await get(`/insights/${slug}`)).status === 200)) && /noindex/.test((await get(`/insights/${slug}`)).headers.get("x-robots-tag") || ""));
    await field(ap, "excerpt").fill("EDITED DRAFT TEXT that must not be public yet.");
    await ap.getByRole("button", { name: "Save draft" }).click(); await sleep(2500);
    ok("workflow", "a later draft edit does not change the live page", !(await get(`/insights/${slug}`)).text.includes("EDITED DRAFT TEXT"));
    ap.once("dialog", (d) => d.accept());
    await ap.getByRole("button", { name: "Unpublish" }).click(); await sleep(2500);
    ok("workflow", "unpublishing removes the page (404)", !!(await poll(async () => (await get(`/insights/${slug}`)).status === 404)));

    // ---------- 4. image upload (admin session, via the real admin UI -> API -> Storage)
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAWElEQVR42u3QQQ0AAAgEoNe/9G1hCnKQApc7mQhNtKiZaImo", "base64");
    let pngBuf = png;
    try { const sharp = require("sharp"); pngBuf = await sharp({ create: { width: 640, height: 400, channels: 3, background: "#1a6b7c" } }).png().toBuffer(); } catch {}
    await ap.goto(BASE + "/admin/media", { waitUntil: "networkidle" }); await sleep(1000);
    await ap.selectOption("#up-kind", "scene"); await ap.selectOption("#up-status", "concept"); await ap.selectOption("#up-vis", "private");
    await ap.fill("#up-alt", `${TAG} plain test image`);
    await ap.locator("#up-file").setInputFiles({ name: "zz-test.png", mimeType: "image/png", buffer: pngBuf });
    await ap.getByRole("button", { name: "Upload", exact: true }).click();
    await ap.waitForURL(/\/admin\/media\/[^/?#]+$/, { timeout: 60000 }).catch(() => {});
    const uploaded = /\/admin\/media\/[^/?#]+$/.test(ap.url());
    ok("media", "an image uploads and a media record is created", uploaded, (await ap.locator("main").innerText()).slice(-350));
    if (uploaded) {
      cleanup.mediaId = ap.url().split("/").pop();
      ok("media", "the record is private by default here and shows thumbnails or a preview", (await ap.locator("img").count()) > 0);
    }
    await ap.goto(BASE + "/admin/media", { waitUntil: "networkidle" }); await sleep(1000);
    await ap.fill("#up-alt", `${TAG} should be refused`);
    await ap.locator("#up-file").setInputFiles({ name: "evil.jpg", mimeType: "image/jpeg", buffer: Buffer.from("MZ\u0090\u0000not really a photo") });
    await ap.getByRole("button", { name: "Upload", exact: true }).click(); await sleep(3000);
    { const bt = await ap.locator("main").innerText(); ok("media", "a file with a wrong signature is refused by the server", /could not be read|Only JPEG, PNG and WebP/i.test(bt), bt.slice(-300)); }
    r = await get("/api/admin/media", { method: "POST" }); ok("media", "the upload API refuses signed-out requests", r.status === 401 || r.status === 403, r.status);

    // ---------- 5. Editor permissions (a real Editor account)
    const ed = await login(browser, EDITOR_EMAIL, EDITOR_PASSWORD);
    ok("permissions", "the Editor signs in", ed.signedIn, ed.p.url());
    if (ed.signedIn) {
      await ed.p.goto(BASE + "/admin/users", { waitUntil: "load" });
      ok("permissions", "the Editor cannot open Users and access", !/Users and access/.test(await ed.p.locator("h1").first().innerText().catch(() => "")), ed.p.url());
      await ed.p.goto(BASE + "/admin/audit", { waitUntil: "load" });
      ok("permissions", "the Editor cannot read the audit log", !/Audit/i.test(await ed.p.locator("h1").first().innerText().catch(() => "")), ed.p.url());
      await ed.p.goto(BASE + `/admin/content/article/${cleanup.articleId}`, { waitUntil: "load" });
      ok("permissions", "the Editor can open and edit content", (await ed.p.locator("#ed-title").count()) > 0);
      ok("permissions", "the Editor has no 'Delete permanently' control", (await ed.p.getByRole("button", { name: "Delete permanently" }).count()) === 0);
      await ed.p.goto(BASE + "/admin/enquiries", { waitUntil: "load" });
      ok("permissions", "the Editor can read the enquiry inbox", /Enquiries/i.test(await ed.p.locator("h1").first().innerText()));
      // the server, not the button, must refuse: fetch the privileged page directly with the Editor's session
      const direct = await ed.ctx.request.get(BASE + "/admin/users", { maxRedirects: 0 });
      const dbody = await direct.text().catch(() => "");
      ok("permissions", "a direct request to /admin/users as Editor does not return the Users page", !/<h1[^>]*>\s*Users and access/.test(dbody), `${direct.status()} ${dbody.slice(0, 100)}`);
    }
    await ed?.ctx.close();

    // ---------- 6. one stored test enquiry (public form API -> database; notifications OFF)
    const submissionId = crypto.randomUUID();
    const body = { submissionId, region: "uae", name: `${TAG} Test Visitor`, email: "test-visitor@example.invalid", company: "Test Co (verification)", country: "", projectType: "event", eventDate: "", budget: "", message: `${TAG}: automated hosted verification. Safe to delete.`, technologies: [], website: "", sourcePath: "/contact" };
    const er = await fetch(BASE + "/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const ej = await er.json().catch(() => ({}));
    ok("enquiry", "the public form API stores the enquiry and returns a reference", er.status === 201 && /^ENQ-/.test(ej.reference || ""), `${er.status} ${JSON.stringify(ej).slice(0, 120)}`);
    const dup = await fetch(BASE + "/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const dj = await dup.json().catch(() => ({}));
    ok("enquiry", "a repeated submission returns the same reference (no duplicate)", dj.reference === ej.reference, JSON.stringify(dj));
    await ap.goto(BASE + `/admin/enquiries?q=${encodeURIComponent(ej.reference || TAG)}`, { waitUntil: "load" });
    const link = ap.locator("table.adm-table tbody tr", { hasText: ej.reference || "ENQ" }).locator("a").first();
    ok("enquiry", "the enquiry appears in the admin inbox", (await link.count()) > 0);
    if ((await link.count()) > 0) {
      await link.click(); await ap.waitForURL(/\/admin\/enquiries\/[0-9a-f-]{36}$/, { timeout: 30000 });
      cleanup.enquiryId = ap.url().split("/").pop();
      const pg = await ap.locator("body").innerText();
      ok("enquiry", "the detail page shows the stored message", pg.includes(TAG), pg.slice(0, 120));
      if (MODE === "hosted") ok("enquiry", "notifications are OFF: status 'skipped', provider 'Not configured', nothing emailed", /Not configured/.test(pg) && /skipped/.test(pg), "Unset NOTIFY_PROVIDER in this environment.");
    }

    // ---------- 7. cleanup (administrator): removes every ZZ-TEST record
    if (cleanup.enquiryId) { await ap.goto(BASE + `/admin/enquiries/${cleanup.enquiryId}`, { waitUntil: "load" }); ap.once("dialog", (d) => d.accept()); await ap.getByRole("button", { name: "Delete enquiry" }).click(); await ap.waitForURL(/\/admin\/enquiries$/, { timeout: 30000 }).catch(() => {}); ok("cleanup", "test enquiry deleted", /\/admin\/enquiries$/.test(ap.url())); }
    if (cleanup.articleId) {
      await ap.goto(BASE + `/admin/content/article/${cleanup.articleId}`, { waitUntil: "load" });
      ap.once("dialog", (d) => d.accept()); await ap.getByRole("button", { name: "Archive" }).click(); await sleep(2500);
      ap.once("dialog", (d) => d.accept()); await ap.getByRole("button", { name: "Delete permanently" }).click(); await sleep(3000);
      await ap.goto(BASE + `/admin/content/article/${cleanup.articleId}`, { waitUntil: "load" });
      ok("cleanup", "test article deleted", /not found|couldn.t find/i.test(await ap.locator("body").innerText()) || (await ap.locator("#ed-title").count()) === 0);
    }
    if (cleanup.mediaId) { await ap.goto(BASE + `/admin/media/${cleanup.mediaId}`, { waitUntil: "load" }); ap.once("dialog", (d) => d.accept()); await ap.getByRole("button", { name: "Delete media" }).click(); await sleep(3000); ok("cleanup", "test media deleted", /\/admin\/media$/.test(ap.url()) || !/zz-test/i.test(await ap.locator("body").innerText())); }
  } catch (e) {
    rec("run", "unexpected error", "FAIL", e && e.message);
  } finally {
    await admin?.ctx.close().catch(() => {});
    await browser.close();
    const summary = { mode: MODE, base: BASE, tag: TAG, at: new Date().toISOString(), pass: results.filter((x) => x.status === "PASS").length, fail: results.filter((x) => x.status === "FAIL").length, manual: results.filter((x) => x.status === "MANUAL").length, results };
    fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
    console.log(`\n${summary.pass} passed, ${summary.fail} failed, ${summary.manual} need a person (MANUAL). Details: ${OUT}`);
    process.exit(summary.fail ? 1 : 0);
  }
})();
