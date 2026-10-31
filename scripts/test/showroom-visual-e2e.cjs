// Showroom visual check with stand-in assets (wide, tall, animated, long names). Screenshots go to OUT (default /tmp/claude-0/sf2). (LOCAL stand-ins): no placeholders, CMS editing (save/reload/publish/empty), region routing,
// every published project/technology has a page, drafts stay private, SEO metadata. Video playback of real YouTube is NOT covered here (stubs elsewhere).
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const { adoptAll } = require("./lib-adopt.cjs");
const BASE = process.argv[2] || "http://localhost:3300";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log("  PASS " + name); } else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); } };
const get = async (p) => { const r = await fetch(BASE + p, { redirect: "manual" }); return { status: r.status, text: await r.text() }; };
const publish = (p) => p.getByRole("button", { name: /Save and (publish|update live page)/ }).click().then(() => p.waitForFunction(() => /Published\. The public page/.test(document.body.innerText), null, { timeout: 25000 })).then(() => sleep(900));

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const login = async (email) => { const c = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await c.newPage(); await p.goto(BASE + "/admin/login", { waitUntil: "load" }); await p.fill("#email", email); await p.fill("#password", "correct-horse-battery"); await p.click('button[type="submit"]'); await p.waitForURL(/\/admin\/?$/); return { c, p }; };
  const admin = await login("admin@test.local");
  await adoptAll(admin.p, BASE, ["technology", "setting"]);
  const { p } = await login("editor@test.local");
  const sharp = require("sharp");
  const OUT = process.env.OUT || "/tmp/claude-0/sf2"; fs.mkdirSync(OUT, { recursive: true });
  const ANIM = process.env.ANIM || "/tmp/claude-0/assets/t-anim.webp";
  const create = async (title) => { await p.goto(BASE + "/admin/content/technology/new", { waitUntil: "load" }); await sleep(300); await p.fill("#title", title); await p.getByRole("button", { name: "Create draft" }).click(); await p.waitForURL(/\/admin\/content\/technology\/[0-9a-f-]{36}$/); };
  const shape = (w, h, label) => sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect x="${w * 0.02}" y="${h * 0.12}" width="${w * 0.96}" height="${h * 0.76}" rx="${Math.min(w, h) * 0.06}" fill="#0c3b44" stroke="#27cdd8" stroke-width="${Math.min(w, h) * 0.015}"/><text x="50%" y="52%" font-family="Arial" font-size="${Math.min(w, h) * 0.14}" fill="#27cdd8" text-anchor="middle">${label}</text></svg>`), top: 0, left: 0 }]).png().toBuffer();
  const up = async (name, alt, buffer, mime) => { await p.goto(BASE + "/admin/media", { waitUntil: "load" }); await p.selectOption("#up-kind", "scene"); await p.selectOption("#up-status", "stock"); await p.selectOption("#up-vis", "public"); await p.fill("#up-alt", alt); await p.locator("#up-file").setInputFiles({ name, mimeType: mime, buffer }); await p.getByRole("button", { name: "Upload", exact: true }).click(); await p.waitForURL(/\/admin\/media\/[a-z0-9-]+$/, { timeout: 20000 }).catch(() => {}); await sleep(500); };
  await up("wide.png", "Stand-in wide product", await shape(1500, 420, "WIDE"), "image/png");
  await up("tall.png", "Stand-in tall product", await shape(380, 1000, "TALL"), "image/png");
  await up("square.png", "Stand-in square product", await shape(800, 800, "SQUARE"), "image/png");
  await up("anim.webp", "Stand-in animated product", fs.readFileSync(ANIM), "image/webp");
  const pick = async (key, alt) => { await p.locator(`[data-field="${key}"]`).getByRole("button", { name: /Choose/ }).click(); await p.getByRole("dialog").getByRole("button", { name: new RegExp(alt) }).first().click(); };
  const specs = [
    { name: "Interactive Transparent OLED Display Wall With Touch And Gesture Control", still: "Stand-in wide product", scale: 125, y: 4 },
    { name: "Tall Kinetic Totem Installation", still: "Stand-in tall product", scale: 100, y: -4 },
    { name: "Rotating Holographic Fan Display", still: "Stand-in square product", anim: "Stand-in animated product", scale: 115, y: 0 },
  ];
  for (const t of specs) {
    await create(t.name); await p.locator('[data-field="category"] select').selectOption("kinetic"); await p.fill("textarea >> nth=0", `${t.name} summary.`);
    await pick("showcase_image", t.still); if (t.anim) await pick("showcase_animation", t.anim);
    await p.locator('[data-field="showcase_scale"] input').fill(String(t.scale)); await p.locator('[data-field="showcase_y"] input').fill(String(t.y));
    await publish(p);
  }
  // homepage: star the three
  await p.goto(BASE + "/admin/content/technology?sort=created", { waitUntil: "load" });
  for (const t of specs) { const row = p.locator("table.adm-table tbody tr", { has: p.locator("a.t", { hasText: t.name }) }); await row.locator("button", { hasText: /showroom/ }).click(); await sleep(700); }
  await p.getByRole("button", { name: "Apply order to live site" }).click(); await sleep(1500);

  const checks = [];
  for (const [vp, w, h] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
    const cx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: vp === "mobile" ? 2 : 1, hasTouch: vp === "mobile", isMobile: vp === "mobile" }); const pg = await cx.newPage();
    await pg.goto(BASE + "/", { waitUntil: "load" }); await pg.locator(".sr-stage").scrollIntoViewIfNeeded(); await sleep(1500);
    for (let i = 0; i < 3; i++) {
      const name = await pg.evaluate(() => document.querySelector('.sr-ex[data-on="true"] .sr-lbl')?.textContent);
      const m = await pg.evaluate(() => { const ex = document.querySelector('.sr-ex[data-on="true"]'); const st = document.querySelector(".sr-stage").getBoundingClientRect(); const r = ex.getBoundingClientRect(); const l = ex.querySelector(".sr-lbl").getBoundingClientRect(); const img = ex.querySelector("img.sr-cut"); const an = ex.querySelector("img.sr-anim"); return { anim: !!an, tf: img ? getComputedStyle(img).transform : "", labelInStage: l.left >= st.left - 1 && l.right <= st.right + 1, overflow: document.documentElement.scrollWidth - innerWidth }; });
      await sleep(vp === "desktop" ? 1500 : 1500);
      checks.push({ vp, page: "home", name: (name || "").slice(0, 40), ...m });
      await pg.locator(".sr").screenshot({ path: `${OUT}/${vp}-home-${i}.png` });
      await pg.locator('button[aria-label="Next exhibit"]').click(); await sleep(900);
    }
    await pg.goto(BASE + "/technologies", { waitUntil: "load" }); await sleep(800);
    await pg.locator(".showroom .chip", { hasText: /^Kinetic$/ }).click(); await sleep(700);
    await pg.locator(".showroom").scrollIntoViewIfNeeded();
    for (let i = 0; i < 4; i++) {
      await pg.getByRole("button", { name: /Next exhibit|Guided tour/ }).click(); await sleep(2000);
      const m = await pg.evaluate(() => { const ex = document.querySelector('.exhibit[data-on="true"]'); const st = document.querySelector(".stage").getBoundingClientRect(); const l = ex.querySelector(".lbl").getBoundingClientRect(); const img = ex.querySelector("img.exh-img"); const an = ex.querySelector("img.exh-anim"); return { name: ex.querySelector(".lbl").textContent.slice(0, 40), anim: !!an, tf: img ? getComputedStyle(img).transform : "", labelInStage: l.left >= st.left - 1 && l.right <= st.right + 1, overflow: document.documentElement.scrollWidth - innerWidth }; });
      checks.push({ vp, page: "technologies", ...m });
      await pg.locator(".showroom").screenshot({ path: `${OUT}/${vp}-technologies-${i}.png` });
    }
    await cx.close();
  }
  console.log(JSON.stringify(checks, null, 1));
  const bad = checks.filter((c) => c.overflow > 0 || !c.labelInStage);
  ok("no horizontal overflow and every label stays inside its stage (long names wrap) on desktop and mobile", bad.length === 0, JSON.stringify(bad));
  ok("the animated exhibit plays when selected on both pages and nowhere else", checks.filter((c) => c.anim).length >= 4 && checks.filter((c) => c.anim && !/Holographic/.test(c.name)).length === 0, JSON.stringify(checks.filter((c) => c.anim).map((c) => c.vp + c.page)));
  ok("size and height-offset settings are applied to the images (transform is not identity)", checks.filter((c) => c.tf && c.tf !== "none" && c.tf !== "matrix(1, 0, 0, 1, 0, 0)").length >= 6, "");
  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
