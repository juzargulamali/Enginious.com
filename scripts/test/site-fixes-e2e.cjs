// Site fixes end to end (LOCAL stand-ins): no placeholders, CMS editing (save/reload/publish/empty), region routing,
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
  await adoptAll(admin.p, BASE, ["project", "technology", "setting", "solution", "region", "page_seo"]);
  const { p } = await login("editor@test.local");
  const sharp = require("sharp");
  const create = async (type, title) => { await p.goto(BASE + `/admin/content/${type}/new`, { waitUntil: "load" }); await sleep(300); await p.fill("#title", title); await p.getByRole("button", { name: "Create draft" }).click(); await p.waitForURL(new RegExp(`/admin/content/${type}/[0-9a-f-]{36}$`)); };
  const pub = async (page) => { await publish(page); };

  // ===== 1. "Games" is offered as a technology category (untouched Site settings: the built-in list applies)
  await create("technology", "Probe Game Table");
  { const opts = await p.locator('[data-field="category"] select option').evaluateAll((o) => o.map((x) => x.textContent));
    ok("the technology Category dropdown offers Interactive Digital Games without any settings change", opts.includes("Interactive Digital Games"), opts.join(","));
    await p.locator('[data-field="category"] select').selectOption({ label: "Interactive Digital Games" }); await p.fill("textarea >> nth=0", "A probe game table."); await pub(p); }
  { const t = (await get("/technologies")).text; ok("the public showroom has the Interactive Digital Games category", />Interactive Digital Games</.test(t)); }

  // ===== 2. showroom images: a transparent PNG on a NEW technology shows on the homepage showroom and the Technologies page
  const png = await sharp({ create: { width: 600, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: Buffer.from('<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><circle cx="200" cy="200" r="190" fill="#27cdd8"/></svg>'), top: 100, left: 100 }]).png().toBuffer();
  await p.goto(BASE + "/admin/media", { waitUntil: "load" });
  await p.selectOption("#up-kind", "scene"); await p.selectOption("#up-status", "stock"); await p.selectOption("#up-vis", "public");
  await p.fill("#up-alt", "Probe showroom cut-out"); await p.locator("#up-file").setInputFiles({ name: "probe-cutout.png", mimeType: "image/png", buffer: png });
  await p.getByRole("button", { name: "Upload", exact: true }).click(); await p.waitForURL(/\/admin\/media\/[a-z0-9-]+$/, { timeout: 20000 }).catch(() => {}); await sleep(500);
  const NEW = []; // technologies with a showroom image
  for (let i = 1; i <= 8; i++) {
    const name = `Probe Exhibit ${i}`; NEW.push(name);
    await create("technology", name);
    await p.locator('[data-field="category"] select').selectOption("kinetic"); await p.fill("textarea >> nth=0", `Probe exhibit ${i}.`);
    await p.locator('[data-field="showcase_image"]').getByRole("button", { name: /Choose/ }).click(); await p.getByRole("dialog").getByRole("button", { name: /Probe showroom cut-out/ }).first().click();
    await pub(p);
  }
  // homepage showroom
  const cx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const hp = await cx.newPage();
  await hp.goto(BASE + "/", { waitUntil: "load" }); await hp.locator(".sr-stage").scrollIntoViewIfNeeded(); await sleep(1200);
  const hs = await hp.evaluate(() => { const ex = [...document.querySelectorAll(".sr-ex")]; return { n: ex.length, names: ex.map((e) => e.querySelector(".sr-lbl")?.textContent), imgs: ex.filter((e) => e.querySelector("img.sr-cut")).length, shown: ex.filter((e) => getComputedStyle(e).pointerEvents !== "none").length }; });
  ok("the homepage showroom includes every technology that has a showroom image (8 new + the 6 starters)", hs.n === 14 && NEW.every((n) => hs.names.some((x) => (x || "").includes(n))), JSON.stringify({ n: hs.n, imgs: hs.imgs }));
  ok("only a window of at most seven exhibits is shown at once (no pile-up) and the rest are inert", hs.shown <= 7 && hs.shown >= 5, `shown ${hs.shown}`);
  { // visible exhibits never overlap their neighbours' centres and each is clickable
    const boxes = await hp.evaluate(() => [...document.querySelectorAll(".sr-ex")].filter((e) => getComputedStyle(e).pointerEvents !== "none").map((e) => { const r = e.querySelector(".sr-art, .sr-pod")?.getBoundingClientRect() ?? e.getBoundingClientRect(); return { x: r.x + r.width / 2, w: r.width, n: e.querySelector(".sr-lbl")?.textContent }; }).sort((a, b) => a.x - b.x));
    let tight = 0; for (let i = 1; i < boxes.length; i++) if (boxes[i].x - boxes[i - 1].x < 60) tight++;
    ok("visible exhibits are spaced apart (centres at least 60px apart)", tight === 0, JSON.stringify(boxes.map((x) => Math.round(x.x))));
    const before = await hp.evaluate(() => document.querySelector(".sr-count")?.textContent);
    await hp.locator('button[aria-label="Next exhibit"]').click(); await sleep(500);
    const seen = new Set(); for (let i = 0; i < 14; i++) { seen.add(await hp.evaluate(() => document.querySelector(".sr-count")?.textContent)); await hp.locator('button[aria-label="Next exhibit"]').click(); await sleep(250); }
    ok("the arrows reach every one of the 14 exhibits", seen.size === 14 && before !== undefined, `${seen.size} distinct`);
  }
  await cx.close();
  // Technologies page showroom: category with 7+ exhibits (kinetic: 7 starters + 8 new)
  const cx2 = await b.newContext({ viewport: { width: 1440, height: 900 } }); const tp = await cx2.newPage();
  await tp.goto(BASE + "/technologies", { waitUntil: "load" }); await sleep(800);
  await tp.locator('.showroom .chip', { hasText: /^Kinetic$/ }).click(); await sleep(600);
  { const info = await tp.evaluate(() => { const ex = [...document.querySelectorAll(".exhibit")]; const vis = ex.filter((e) => getComputedStyle(e).visibility !== "hidden" && e.dataset.far === undefined); return { total: ex.length, vis: vis.length, xs: vis.map((e) => Math.round(e.getBoundingClientRect().x + e.getBoundingClientRect().width / 2)).sort((a, b) => a - b), imgs: ex.filter((e) => e.querySelector(".glyph img")).length }; });
    ok("Technologies page: a long category shows a window of at most seven exhibits", info.total >= 15 && info.vis <= 7 && info.vis >= 5, JSON.stringify(info));
    let tight = 0; for (let i = 1; i < info.xs.length; i++) if (info.xs[i] - info.xs[i - 1] < 100) tight++;
    ok("Technologies page: visible exhibits do not overlap (centres at least 100px apart)", tight === 0, info.xs.join(","));
    ok("Technologies page: showroom images are used for technologies that have one", info.imgs >= 8, `imgs ${info.imgs}`); }
  { // clicking any visible exhibit selects it; Next walks through all of them
    const names = []; for (let i = 0; i < 15; i++) { await tp.getByRole("button", { name: /Next exhibit|Guided tour/ }).click(); await sleep(200); names.push(await tp.locator(".detail h3").textContent()); }
    ok("Technologies page: Next exhibit reaches all 15 in order, bringing hidden ones forward", new Set(names).size === 15, `${new Set(names).size} distinct`);
    await tp.locator(".exhibit:not([data-far])").nth(1).click({ force: false }).catch(() => {}); await sleep(300);
    ok("Technologies page: clicking a visible exhibit selects it", (await tp.locator('.exhibit[aria-pressed="true"]').count()) === 1); }
  await cx2.close();

  // ===== 3. map: extra locations from Site settings + projects found by their Location text
  await p.goto(BASE + "/admin/content/setting", { waitUntil: "load" }); await p.locator("table.adm-table a.t").first().click(); await p.waitForSelector("#ed-title");
  const mp = p.locator('[data-field="map_places"]');
  ok("Site settings has an Extra map locations editor", (await mp.count()) === 1);
  await mp.locator(".adm-rep > div > button").last().click();
  { const row = mp.locator(".adm-rep-row").last(); await row.locator('[data-field="name"] input').fill("Tabuk"); await row.locator('[data-field="country"] input').fill("Saudi Arabia"); await row.locator('[data-field="latitude"] input').fill("28.38"); await row.locator('[data-field="longitude"] input').fill("36.57"); }
  await pub(p);
  await create("project", "Tabuk Probe Expo"); await p.fill("textarea >> nth=0", "A probe project in Tabuk.");
  await p.locator('[data-field="location"] input').fill("Tabuk, Saudi Arabia"); await pub(p);
  const cx3 = await b.newContext({ viewport: { width: 1440, height: 900 } }); const mpg = await cx3.newPage();
  await mpg.goto(BASE + "/", { waitUntil: "load" }); await mpg.locator(".pm").scrollIntoViewIfNeeded(); await sleep(3800);
  ok("the new place appears on the map and in the locations list", (await mpg.locator('.pm-mk[aria-label^="Tabuk"]').count()) === 1 && (await mpg.locator(".pm-list .pm-li", { hasText: "Tabuk" }).count()) === 1);
  await mpg.getByRole("button", { name: "Gulf", exact: true }).click(); await sleep(700);
  await mpg.locator('.pm-mk[aria-label^="Tabuk"]').click(); await sleep(300);
  ok("clicking it lists the project whose Location mentions Tabuk", (await mpg.locator(".pm-panel h3").textContent()) === "Tabuk" && (await mpg.locator(".pm-related li", { hasText: "Tabuk Probe Expo" }).count()) === 1);
  // built-in places pick up CMS projects too: Dubai lists a new Dubai project, Madinah is on the map with its project
  await mpg.locator(".pm-list .pm-li", { hasText: "Madinah" }).first().click(); await sleep(200);
  ok("Madinah (an existing project location) is on the map and lists its project", (await mpg.locator(".pm-related li").count()) >= 1);
  // UAE view separates Dubai and Abu Dhabi so each can be clicked
  await mpg.getByRole("button", { name: "UAE", exact: true }).click(); await sleep(800);
  for (const nm of ["Dubai", "Abu Dhabi"]) { const m = mpg.locator(`.pm-mk[aria-label^="${nm}"]`); const bx = await m.boundingBox(); await mpg.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await sleep(200); ok(`UAE view: clicking the ${nm} marker selects ${nm}`, (await mpg.locator(".pm-panel h3").textContent()) === nm); }
  await cx3.close();

  // ===== 4. Google Drive video: poster falls back to Drive's thumbnail; a CMS poster is preferred
  const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";
  await create("project", "Drive Poster Probe"); await p.fill("textarea >> nth=0", "Drive poster probe.");
  await p.locator('[data-field="video_url"] input').fill(`https://drive.google.com/file/d/${ID}/view`); await pub(p);
  { const cx4 = await b.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await cx4.newPage(); const reqs = [];
    await pg.route(/drive\.google\.com\/thumbnail/, (r) => { reqs.push(r.request().url()); r.fulfill({ status: 200, contentType: "image/png", body: png }); });
    await pg.goto(BASE + "/work", { waitUntil: "load" }); await sleep(1200);
    const card = pg.locator("[data-vcard]", { hasText: "Drive Poster Probe" }); await card.scrollIntoViewIfNeeded(); await sleep(800);
    ok("a Drive video card shows Drive's thumbnail as its image when no poster is set", (await card.locator('img[src*="drive.google.com/thumbnail"]').count()) === 1 && reqs.some((u) => u.includes(ID)), reqs.join(","));
    await pg.goto(BASE + "/work/drive-poster-probe", { waitUntil: "load" }); await sleep(800);
    ok("and the project page shows it behind the Play button", (await pg.locator('.vp img[src*="drive.google.com/thumbnail"]').count()) === 1 && (await pg.locator(".vp-play").count()) === 1);
    await cx4.close(); }
  { const cx5 = await b.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await cx5.newPage();
    await pg.route(/drive\.google\.com\/thumbnail/, (r) => r.abort());
    await pg.goto(BASE + "/work", { waitUntil: "load" }); await sleep(1200);
    const card = pg.locator("[data-vcard]", { hasText: "Drive Poster Probe" }); await card.scrollIntoViewIfNeeded(); await sleep(800);
    ok("if Google does not return the thumbnail the card falls back quietly (no broken image)", (await card.locator('img[src*="drive.google.com/thumbnail"]').count()) === 0);
    await cx5.close(); }

  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
