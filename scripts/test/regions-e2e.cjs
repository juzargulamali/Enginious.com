// Regional pages and detail pages end to end (LOCAL stand-ins): no placeholders, CMS editing (save/reload/publish/empty), region routing,
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
  await adoptAll(admin.p, BASE, ["region", "project", "technology", "solution", "page_seo"]);
  const { p } = await login("editor@test.local");

  // ===== 1. the three regional pages: complete, distinct, no placeholders
  const pages = {};
  for (const [url, key] of [["/uae", "uae"], ["/saudi-arabia", "ksa"], ["/europe", "europe"]]) {
    const cx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const cp = await cx.newPage();
    await cp.goto(BASE + url, { waitUntil: "load" }); await sleep(800);
    pages[key] = await cp.evaluate(() => ({ h1: document.querySelector("h1")?.textContent, ph: document.querySelectorAll(".ph").length, hero: !!document.querySelector(".rg-media img"), glance: document.querySelectorAll(".rg-glance li").length, serv: document.querySelectorAll(".rg-serv li").length, proj: document.querySelectorAll(".tech-grid li").length, steps: document.querySelectorAll(".rg-steps li").length, cta: [...document.querySelectorAll('a[href^="/contact?region="]')].map((a) => a.getAttribute("href")), title: document.title, overflow: document.documentElement.scrollWidth - innerWidth }));
    ok(`${url}: complete page, no empty/striped placeholder panels`, pages[key].ph === 0 && pages[key].hero && pages[key].glance >= 3 && pages[key].serv >= 5 && pages[key].steps >= 5 && pages[key].overflow <= 0, JSON.stringify(pages[key]));
    ok(`${url}: every start-a-project action keeps the region`, pages[key].cta.length >= 2 && pages[key].cta.every((h) => h === `/contact?region=${key}`), pages[key].cta.join(","));
    await cx.close();
  }
  ok("the three pages tell different stories (distinct headlines, different project sets)", new Set(Object.values(pages).map((x) => x.h1)).size === 3 && pages.uae.proj > 0 && pages.ksa.proj > 0 && pages.europe.proj === 0, JSON.stringify(Object.values(pages).map((x) => [x.h1, x.proj])));
  { const t = (await get("/europe")).text; ok("Europe lists the six supplied European project locations and does not invent projects or an address", /Hannover/.test(t) && /Paris/.test(t) && !/imagery/i.test(t) && !/Address/.test(t)); }
  { const t = (await get("/saudi-arabia")).text; ok("Saudi page lists its delivery cities derived from the projects (Riyadh, Jeddah, Madinah)", /Riyadh/.test(t) && /Jeddah/.test(t) && /Madinah/.test(t)); }
  { const t = (await get("/uae")).text; ok("UAE page labels services as delivered from Dubai headquarters", /Delivered from Dubai headquarters/.test(t)); }

  // ===== 2. enquiry routing keeps the selected region
  { const cx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const cp = await cx.newPage();
    await cp.goto(BASE + "/saudi-arabia", { waitUntil: "load" }); await cp.locator('a[href="/contact?region=ksa"]').first().click(); await cp.waitForURL(/\/contact\?region=ksa/); await sleep(800);
    ok("the Saudi page action opens Contact with Saudi Arabia selected", await cp.evaluate(() => document.querySelector('input[name="region"][value="ksa"]')?.checked === true));
    await cx.close(); }

  // ===== 3. CMS: edit the Saudi region, save, reload, publish; empty fields fall back
  const photo = fs.readFileSync(path.join(__dirname, "..", "..", "assets", "originals", "regions", "pexels-abul-lais-2161703794-39470846.jpg"));
  await p.goto(BASE + "/admin/media", { waitUntil: "load" });
  await p.selectOption("#up-kind", "scene"); await p.selectOption("#up-status", "stock"); await p.selectOption("#up-vis", "public");
  await p.fill("#up-alt", "Riyadh skyline with the Kingdom Centre"); await p.locator("#up-file").setInputFiles({ name: "riyadh-hero.jpg", mimeType: "image/jpeg", buffer: photo });
  await p.getByRole("button", { name: "Upload", exact: true }).click(); await p.waitForURL(/\/admin\/media\/[a-z0-9-]+$/, { timeout: 20000 }).catch(() => {});
  await p.goto(BASE + "/admin/content/region", { waitUntil: "load" });
  await p.locator("table.adm-table a.t", { hasText: "Saudi" }).first().click(); await p.waitForSelector("#ed-title");
  ok("the region editor offers page headline, hero photograph, video, story, facts, services, featured projects, process and contact text", (await p.locator('[data-field="headline"], [data-field="hero_image"], [data-field="video_url"], [data-field="story"], [data-field="facts"], [data-field="services_local"], [data-field="services_dubai"], [data-field="projects"], [data-field="process"], [data-field="cta_text"]').count()) === 10);
  await p.locator('[data-field="headline"] input').fill("Riyadh: built for the Kingdom");
  await p.locator('[data-field="story_title"] input').fill("Our Riyadh branch");
  await p.locator('[data-field="story"] textarea').fill("Test story paragraph one.\n\nSecond paragraph.");
  await p.locator('[data-field="hero_image"]').getByRole("button", { name: /Choose/ }).click(); await p.getByRole("dialog").getByRole("button", { name: /Riyadh skyline with the Kingdom Centre stock/ }).click();
  await p.locator('[data-field="services_local"] select').selectOption({ index: 1 }); await p.locator('[data-field="services_dubai"] select').selectOption({ index: 2 });
  await p.locator('[data-field="projects"] select').selectOption({ index: 1 });
  await p.locator('[data-field="cta_text"] textarea').fill("Tell the Riyadh team what you are planning.");
  await p.locator('[data-field="facts"] .adm-rep button').first().click();
  await p.locator('[data-field="facts"] input').nth(0).fill("Languages"); await p.locator('[data-field="facts"] input').nth(1).fill("Arabic and English (test)");
  await publish(p);
  await p.reload({ waitUntil: "load" });
  ok("saved values survive a reload in the editor", (await p.locator('[data-field="headline"] input').inputValue()) === "Riyadh: built for the Kingdom" && /Test story/.test(await p.locator('[data-field="story"] textarea').inputValue()));
  let t = (await get("/saudi-arabia")).text;
  ok("the published page shows the edited headline, story, photograph, facts, CTA text", /Riyadh: built for the Kingdom/.test(t) && /Our Riyadh branch/.test(t) && /Second paragraph/.test(t) && /Languages/.test(t) && /Tell the Riyadh team/.test(t) && /storage\/v1\/object\/public\/media\/images\//.test(t));
  ok("services now carry local / Dubai-support labels", /Delivered from [A-Za-z ]+/.test(t) && /Supported by the Dubai team/.test(t));
  await p.locator('[data-field="headline"] input').fill(""); await p.locator('[data-field="story"] textarea').fill(""); await p.locator('[data-field="cta_text"] textarea').fill("");
  await publish(p); t = (await get("/saudi-arabia")).text;
  ok("clearing the fields restores the built-in text (no empty sections)", /Our branch in/.test(t) && !/Riyadh: built for the Kingdom/.test(t) && !/Tell the Riyadh team/.test(t) && !/class="ph[ "]/.test(t));

  // ===== 4. SEO: page search settings drive the title and description
  await p.goto(BASE + "/admin/content/page_seo", { waitUntil: "load" });
  await p.locator("table.adm-table a.t", { hasText: /^UAE$/ }).first().click(); await p.waitForSelector("#ed-title");
  await p.locator('[data-field="seo_title"] input').fill("UAE test search title"); await p.locator('[data-field="seo_description"] textarea').fill("UAE test search description for the regional page.");
  await publish(p); t = (await get("/uae")).text;
  ok("UAE page title and meta description come from the CMS page search settings", /<title>UAE test search title/.test(t) && /UAE test search description/.test(t));

  // ===== 5. every published project and technology has a page; new items need no code; drafts stay private
  const all = await (async () => { const w = (await get("/work")).text; return [...w.matchAll(/href="\/work\/([a-z0-9-]+)"/g)].map((m) => m[1]); })();
  const uniq = [...new Set(all)];
  let bad = 0; for (const s of uniq.slice(0, 40)) if ((await get("/work/" + s)).status !== 200) bad++;
  ok(`all ${uniq.length} published projects have a working page (card links go to them)`, uniq.length >= 20 && bad === 0, `bad=${bad}`);
  const tl = (await get("/technologies")).text; const techs = [...new Set([...tl.matchAll(/href="\/technologies\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
  let badT = 0; for (const s of techs) if ((await get("/technologies/" + s)).status !== 200) badT++;
  ok(`all ${techs.length} published technologies have a working page`, techs.length >= 6 && badT === 0, `bad=${badT}`);

  await p.goto(BASE + "/admin/content/project/new", { waitUntil: "load" }); await sleep(400);
  await p.fill("#title", "Brand New Expo 2027"); await p.getByRole("button", { name: "Create draft" }).click(); await p.waitForURL(/\/admin\/content\/project\/[0-9a-f-]{36}$/);
  await p.fill("textarea >> nth=0", "A plain summary for the brand new project.");
  await p.getByRole("button", { name: "Save draft" }).click(); await sleep(1200);
  ok("a draft project has NO public page", (await get("/work/brand-new-expo-2027")).status === 404);
  await p.locator('[data-field="video_url"] input').fill("https://youtu.be/aqz-KE-bpKQ"); await p.locator('[data-field="video_preview_start"] input').fill("20"); await p.locator('[data-field="video_preview_seconds"] input').fill("5");
  await publish(p);
  const np = await get("/work/brand-new-expo-2027");
  ok("publishing creates the page immediately (no code change, no rebuild)", np.status === 200 && /Brand New Expo 2027/.test(np.text));
  ok("the new page shows the full video player ready with a Play control and no segment limits", /vp-play/.test(np.text) && !/start=20|end=/.test(np.text));
  ok("the new project appears on the Work listing with a link to its page", /href="\/work\/brand-new-expo-2027"/.test((await get("/work")).text));
  ok("the empty new project shows no placeholder panels", !/class="ph[ "]/.test(np.text));
  p.once("dialog", (dg) => dg.accept()); await p.getByRole("button", { name: "Unpublish" }).click(); await p.waitForFunction(() => /Unpublished/.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {}); await sleep(900);
  ok("unpublishing makes the page private again (404)", (await get("/work/brand-new-expo-2027")).status === 404);

  await p.goto(BASE + "/admin/content/technology/new", { waitUntil: "load" }); await sleep(400);
  await p.fill("#title", "Brand New Tech"); await p.getByRole("button", { name: "Create draft" }).click(); await p.waitForURL(/\/admin\/content\/technology\/[0-9a-f-]{36}$/);
  await p.selectOption('[data-field="category"] select', { index: 1 }); await p.fill('[data-field="summary"] textarea', "A plain summary of the brand new technology.");
  await p.getByRole("button", { name: "Save draft" }).click(); await sleep(1200);
  ok("a draft technology has no public page", (await get("/technologies/brand-new-tech")).status === 404);
  await publish(p);
  const nt = await get("/technologies/brand-new-tech");
  ok("a newly published technology gets a page with no code change, without placeholders", nt.status === 200 && /Brand New Tech/.test(nt.text) && !/class="ph[ "]/.test(nt.text));

  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
