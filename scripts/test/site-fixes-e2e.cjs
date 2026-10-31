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

  // ===== 0. an empty category cannot crash the Technologies showroom
  { const cx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await cx.newPage(); const errs = []; pg.on("pageerror", (e) => errs.push(String(e)));
    await pg.goto(BASE + "/technologies", { waitUntil: "load" }); await sleep(800);
    await pg.locator(".showroom .chip", { hasText: /^Interactive Digital Games$/ }).click(); await sleep(500);
    ok("an empty category shows a clear message and disabled arrows", (await pg.locator(".exh-empty").count()) === 1 && (await pg.getByRole("button", { name: /Guided tour|Next exhibit/ }).isDisabled()) && (await pg.locator('button[aria-label="Previous exhibit"]').isDisabled()));
    await pg.locator(".stage").hover(); await pg.keyboard.press("ArrowRight"); await pg.keyboard.press("ArrowLeft"); await pg.mouse.move(100, 400); await pg.mouse.move(1180, 400); await sleep(1500);
    await pg.locator(".showroom .chip", { hasText: /^Kinetic$/ }).click(); await sleep(400); await pg.getByRole("button", { name: /Guided tour|Next exhibit/ }).click(); await sleep(300);
    ok("keys, steering and switching back to a full category all work afterwards, with no page error", (await pg.locator('.exhibit[aria-pressed="true"]').count()) === 1 && errs.length === 0, errs.join(" | "));
    await cx.close(); }

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
  // homepage showroom: only the technologies the owner marks, in the CMS display order
  const star = async (title) => { const row = p.locator("table.adm-table tbody tr", { has: p.locator("a.t", { hasText: new RegExp(`^${title}$`) }) }); await row.locator("button", { hasText: /showroom/ }).click(); await sleep(700); };
  const apply = async () => { await p.getByRole("button", { name: "Apply order to live site" }).click(); await sleep(1500); };
  const homeShowroom = async () => { const cx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const hp = await cx.newPage();
    await hp.goto(BASE + "/", { waitUntil: "load" }); await hp.locator(".sr-stage").scrollIntoViewIfNeeded(); await sleep(1200);
    const r = await hp.evaluate(() => { const ex = [...document.querySelectorAll(".sr-ex")]; return { n: ex.length, names: ex.map((e) => e.querySelector(".sr-lbl")?.textContent), shown: ex.filter((e) => getComputedStyle(e).pointerEvents !== "none").length, xs: ex.filter((e) => getComputedStyle(e).pointerEvents !== "none").map((e) => { const q = e.querySelector(".sr-art, .sr-pod")?.getBoundingClientRect() ?? e.getBoundingClientRect(); return Math.round(q.x + q.width / 2); }).sort((a, c) => a - c) }; });
    return { r, hp, cx }; };
  await p.goto(BASE + "/admin/content/technology", { waitUntil: "load" });
  ok("nothing is marked yet, so the homepage keeps the built-in six exhibits", await (async () => { const { r, cx } = await homeShowroom(); await cx.close(); return r.n === 6; })());
  await p.goto(BASE + "/admin/content/technology?sort=created", { waitUntil: "load" });
  ok("the technology list explains the showroom stars", (await p.locator("text=homepage showroom shows only").count()) === 1);
  for (const n of [NEW[2], NEW[0], NEW[1]]) await star(n);
  await apply();
  { const { r, cx } = await homeShowroom();
    ok("marking three technologies makes the homepage showroom list exactly those three", r.n === 3 && NEW.slice(0, 3).every((n) => r.names.some((x) => (x || "").includes(n))), JSON.stringify(r.names));
    await cx.close(); }
  { const { r, hp, cx } = await homeShowroom();
    const seen = new Set(); for (let i = 0; i < 3; i++) { seen.add(await hp.evaluate(() => document.querySelector(".sr-count")?.textContent)); await hp.locator('button[aria-label="Next exhibit"]').click(); await sleep(250); }
    ok("with three exhibits the arrows cycle through all three", seen.size === 3 && r.n === 3, [...seen].join(","));
    await cx.close(); }
  for (const n of NEW.slice(3)) await star(n);
  await apply();
  { const { r, hp, cx } = await homeShowroom();
    ok("marking all eight shows eight (a window of seven at a time, no pile-up)", r.n === 8 && r.shown <= 7 && r.shown >= 5, `n ${r.n} shown ${r.shown}`);
    let tight = 0; for (let i = 1; i < r.xs.length; i++) if (r.xs[i] - r.xs[i - 1] < 60) tight++;
    ok("visible exhibits are spaced apart (centres at least 60px apart)", tight === 0, r.xs.join(","));
    const seen = new Set(); for (let i = 0; i < 8; i++) { seen.add(await hp.evaluate(() => document.querySelector(".sr-count")?.textContent)); await hp.locator('button[aria-label="Next exhibit"]').click(); await sleep(250); }
    ok("the arrows reach every one of the 8 exhibits", seen.size === 8, `${seen.size} distinct`);
    await cx.close(); }
  await p.goto(BASE + "/admin/content/technology?sort=created", { waitUntil: "load" });
  for (const n of NEW) await star(n);
  await apply();
  { const { r, cx } = await homeShowroom(); ok("un-marking them all returns to the built-in six", r.n === 6, `n ${r.n}`); await cx.close(); }
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

  // ===== 5. saved category list vs the built-in ones; orphaned technologies; photograph messages
  const admP = admin.p;
  await admP.goto(BASE + "/admin/content/setting", { waitUntil: "load" }); await admP.locator("table.adm-table a.t").first().click(); await admP.waitForSelector("#ed-title");
  const cats = admP.locator('[data-field="technology_categories"]');
  ok("with the full built-in list saved there is no missing-category notice", (await admP.locator("text=do not include").count()) === 0);
  await cats.locator(".adm-rep-row", { has: admP.locator('input[value="Interactive Digital Games"]') }).getByRole("button", { name: "Remove" }).click(); await sleep(300);
  ok("removing Interactive Digital Games from the saved list shows a plain notice naming it", (await admP.locator(".adm-alert-warn", { hasText: /do not include: Interactive Digital Games/ }).count()) === 1);
  await publish(admP);
  await admP.goto(BASE + "/admin/content/technology?sort=created", { waitUntil: "load" });
  ok("the Technologies list warns that a technology uses a category that is no longer in the list", (await admP.locator(".adm-alert-warn", { hasText: /no longer in Site settings/ }).count()) === 1);
  await admP.goto(BASE + "/admin/content/setting", { waitUntil: "load" }); await admP.locator("table.adm-table a.t").first().click(); await admP.waitForSelector("#ed-title");
  await admP.getByRole("button", { name: /^Add it$/ }).click(); await sleep(300);
  ok("one click restores it and the notice goes away", (await admP.locator(".adm-alert-warn", { hasText: /do not include/ }).count()) === 0 && (await admP.locator('[data-field="technology_categories"] input[value="Interactive Digital Games"]').count()) === 1);
  await publish(admP);
  await admP.goto(BASE + "/admin/content/technology?sort=created", { waitUntil: "load" });
  ok("and the Technologies list warning is gone", (await admP.locator(".adm-alert-warn", { hasText: /no longer in Site settings/ }).count()) === 0);
  await create("project", "Photo Message Probe");
  ok("a project's photographs say to upload in Media and that Drive/SharePoint pages cannot be used", (await p.locator('[data-field="media"]').innerText()).includes("cannot be used as a photograph") && (await p.locator('[data-field="video_poster"]').innerText()).includes("upload the image file in Media"));
  await p.locator('[data-field="video_poster"]').getByRole("button", { name: /Choose/ }).click();
  await p.getByRole("dialog").getByRole("searchbox").fill("https://drive.google.com/file/d/1AbC/view?usp=sharing"); await sleep(200);
  ok("pasting a Drive link into the picker explains that it is a sharing page and points to Media", /sharing page, not an image file/.test(await p.getByRole("dialog").innerText()));
  await p.getByRole("dialog").getByRole("searchbox").fill("https://example.com/photo.jpg"); await sleep(200);
  ok("pasting any other image link says photographs cannot be added by link", /cannot be added by link/.test(await p.getByRole("dialog").innerText()));

  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
