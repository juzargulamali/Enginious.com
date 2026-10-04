// Populates the LOCAL CMS with realistic demo data, then checks desktop and mobile admin layouts (overflow, labels, focus) and takes screenshots.
//   NODE_PATH=$(npm root -g) node scripts/test/admin-visual.cjs [baseUrl] [outDir]
const { chromium } = require("playwright");
const sharp = require("sharp");
const crypto = require("crypto");
const BASE = process.argv[2] || "http://localhost:3300";
const OUT = process.argv[3] || "/tmp/claude-0/adm";
require("fs").mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log("  PASS " + name); } else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); } };

const ENQ = [
  ["Layla Haddad", "layla@regionalexpo.test", "Regional Expo Group", "ksa", "event", "We need an interactive centrepiece for our 2027 stand in Riyadh. Touch, motion and a strong brand story.", ["tri-helix", "touch-and-throw"]],
  ["Marek Nowak", "marek@polishmuseum.test", "Museum of Light", "europe", "permanent", "A permanent immersive room for a new science museum wing. We would like to discuss maintenance too.", ["immersive-room"]],
  ["Sara Khan", "sara@brandagency.test", "North Agency", "uae", "event", "Activation for a product launch in Dubai in February. About 400 guests, short build window.", []],
  ["Tomasz Lis", "tomasz@bank.test", "", "europe", "other", "Exploring whether a kinetic display could work in our lobby.", ["arc-shift"]],
];

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/admin/login", { waitUntil: "load" }); await p.fill("#email", "admin@test.local"); await p.fill("#password", "correct-horse-battery"); await p.click('button[type="submit"]'); await p.waitForURL(/\/admin\/?$/);

  // demo data: import every type, enquiries, media
  for (const t of ["project", "technology", "person", "client", "region", "company_section", "solution", "setting", "page_seo"]) {
    await p.goto(`${BASE}/admin/content/${t}`, { waitUntil: "load" });
    p.once("dialog", (d) => d.accept()); await p.getByRole("button", { name: "Import starter content" }).click(); await p.waitForSelector("table.adm-table", { timeout: 30000 });
  }
  for (const [name, email, company, region, projectType, message, technologies] of ENQ) {
    await fetch(BASE + "/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: crypto.randomUUID(), region, name, email, company, country: "", projectType, eventDate: "", budget: "", message, technologies, website: "", sourcePath: "/contact" }) });
  }
  const tile = (w, h, c1, c2) => sharp({ create: { width: w, height: h, channels: 3, background: c1 } }).composite([{ input: Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w * 0.7}" cy="${h * 0.4}" r="${h * 0.22}" fill="none" stroke="#46e9f3" stroke-width="6"/></svg>`) }]).jpeg().toBuffer();
  const imgs = [["Exhibition stand concept render", "concept", "scene", "#06202a", "#0c5a6a"], ["Experience centre concept render", "concept", "scene", "#101a33", "#27cdd8"], ["Preview portrait (not an employee)", "preview-portrait", "portrait", "#1a1030", "#5a3a8a"]];
  for (const [alt, status, kind, c1, c2] of imgs) {
    await p.goto(BASE + "/admin/media", { waitUntil: "load" });
    await p.selectOption("#up-kind", kind); await p.selectOption("#up-status", status); await p.fill("#up-alt", alt);
    await p.locator("#up-file").setInputFiles({ name: "demo.jpg", mimeType: "image/jpeg", buffer: await tile(kind === "portrait" ? 1200 : 1800, kind === "portrait" ? 1600 : 1000, c1, c2) });
    await p.getByRole("button", { name: "Upload", exact: true }).click(); await sleep(2500);
  }
  // a draft with unpublished edits
  await p.goto(`${BASE}/admin/content/project?q=Dubai%20Airshow`, { waitUntil: "load" });
  await p.locator("table.adm-table a.t").first().click(); await p.waitForSelector("#ed-title");
  await p.fill("#ed-title", (await p.inputValue("#ed-title")) + " (edited draft)"); await p.getByRole("button", { name: "Save draft" }).click(); await sleep(1500);
  await p.goto(`${BASE}/admin/enquiries`, { waitUntil: "load" });
  await p.locator("table.adm-table a.t").first().click(); await p.waitForSelector("h1"); await p.getByRole("button", { name: "In progress" }).click(); await sleep(1000);
  await ctx.close();

  // ---- layouts
  const pages = [
    ["dashboard", "/admin"],
    ["projects", "/admin/content/project"],
    ["media-library", "/admin/media"],
    ["enquiry-inbox", "/admin/enquiries"],
    ["users", "/admin/users"],
    ["redirects", "/admin/redirects"],
  ];
  for (const [vname, vp, touch] of [["desktop", { width: 1440, height: 900 }, false], ["mobile", { width: 390, height: 844 }, true]]) {
    const c = await b.newContext({ viewport: vp, deviceScaleFactor: touch ? 2 : 1, hasTouch: touch, isMobile: touch });
    const q = await c.newPage();
    await q.goto(BASE + "/admin/login", { waitUntil: "load" });
    await q.screenshot({ path: `${OUT}/${vname}-login.png` });
    await q.fill("#email", "admin@test.local"); await q.fill("#password", "correct-horse-battery"); await q.click('button[type="submit"]'); await q.waitForURL(/\/admin\/?$/);
    for (const [name, path] of pages) {
      await q.goto(BASE + path, { waitUntil: "load" }); await sleep(700);
      const w = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      ok(`${vname} ${name}: no horizontal overflow`, w.sw <= w.cw + 1, JSON.stringify(w));
      await q.screenshot({ path: `${OUT}/${vname}-${name}.png`, fullPage: vname === "mobile" && name !== "dashboard" ? false : false });
    }
    // editor
    await q.goto(BASE + "/admin/content/project?q=Dubai%20Airshow", { waitUntil: "load" });
    await q.locator("table.adm-table a.t").first().click(); await q.waitForSelector("#ed-title"); await sleep(700);
    const w = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(`${vname} project editor: no horizontal overflow`, w.sw <= w.cw + 1, JSON.stringify(w));
    await q.screenshot({ path: `${OUT}/${vname}-project-editor.png` });
    // labels: every visible form control has an accessible name
    const unlabeled = await q.evaluate(() => [...document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select")].filter((e) => { const r = e.getBoundingClientRect(); if (!r.width) return false; const id = e.id; return !(e.getAttribute("aria-label") || (id && document.querySelector(`label[for="${id}"]`)) || e.closest("label")); }).map((e) => e.name || e.id || e.type));
    ok(`${vname} project editor: every form control is labelled`, unlabeled.length === 0, unlabeled.join(","));
    // keyboard: tab reaches a control with a visible focus ring
    await q.keyboard.press("Tab"); await q.keyboard.press("Tab");
    const ring = await q.evaluate(() => { const e = document.activeElement; if (!e) return ""; const s = getComputedStyle(e); return `${s.outlineStyle} ${s.outlineWidth}`; });
    ok(`${vname}: keyboard focus shows an outline`, /solid|auto/.test(ring) && !/ 0px/.test(ring), ring);
    // media detail + enquiry detail
    await q.goto(BASE + "/admin/media", { waitUntil: "load" }); await q.locator("a.adm-mcard").first().click(); await q.waitForSelector("#m-alt"); await sleep(500);
    const wm = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(`${vname} media detail: no horizontal overflow`, wm.sw <= wm.cw + 1, JSON.stringify(wm));
    await q.screenshot({ path: `${OUT}/${vname}-media-detail.png` });
    await q.goto(BASE + "/admin/enquiries", { waitUntil: "load" }); await q.locator("table.adm-table a.t").first().click(); await q.waitForSelector("h1"); await sleep(500);
    const we = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(`${vname} enquiry detail: no horizontal overflow`, we.sw <= we.cw + 1, JSON.stringify(we));
    await q.screenshot({ path: `${OUT}/${vname}-enquiry-detail.png` });
    // mobile menu works without script
    if (touch) { await q.goto(BASE + "/admin", { waitUntil: "load" }); await q.locator("details.adm-top summary").click(); ok("mobile: the menu opens and lists the sections", await q.getByRole("link", { name: "Media library" }).first().isVisible()); await q.screenshot({ path: `${OUT}/mobile-menu.png` }); }
    await c.close();
  }
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
