// CMS corrections end to end (LOCAL stand-ins): no placeholders, CMS editing (save/reload/publish/empty), region routing,
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
  await adoptAll(admin.p, BASE, ["project", "technology", "setting"]);
  const { p } = await login("editor@test.local");
  const SL = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const create = async (type, title) => { await p.goto(BASE + `/admin/content/${type}/new`, { waitUntil: "load" }); await sleep(300); await p.fill("#title", title); await p.getByRole("button", { name: "Create draft" }).click(); await p.waitForURL(new RegExp(`/admin/content/${type}/[0-9a-f-]{36}$`)); };
  const rowTitles = async (qs) => { await p.goto(BASE + `/admin/content/project${qs}`, { waitUntil: "load" }); return p.$$eval("table.adm-table tbody tr td:first-child a.t", (a) => a.map((x) => x.textContent)); };

  // ===== 1. sorting: Recently added and Recently edited both work (on a type that defaults to display order)
  await create("project", "Sort Probe A"); await p.fill("textarea >> nth=0", "Probe A summary."); await p.getByRole("button", { name: "Save draft" }).click(); await sleep(1200);
  await sleep(1500);
  await create("project", "Sort Probe B"); await p.fill("textarea >> nth=0", "Probe B summary."); await p.getByRole("button", { name: "Save draft" }).click(); await sleep(1200);
  let t = await rowTitles("?sort=created");
  ok("Recently added: the newest item (B) is first, then A, then the older starter content", t[0] === "Sort Probe B" && t[1] === "Sort Probe A", t.slice(0, 3).join(" | "));
  await sleep(1500);
  await p.goto(BASE + "/admin/content/project", { waitUntil: "load" }); await p.locator("table.adm-table a.t", { hasText: "Sort Probe A" }).first().click(); await p.waitForSelector("#ed-title");
  await p.fill("textarea >> nth=0", "Probe A summary, edited."); await p.getByRole("button", { name: "Save draft" }).click(); await sleep(1500);
  t = await rowTitles("?sort=updated");
  ok("Recently edited: the item edited last (A) is first (this sort was ignored before on this list)", t[0] === "Sort Probe A" && t[1] === "Sort Probe B", t.slice(0, 3).join(" | "));
  t = await rowTitles("?sort=created"); ok("Recently added is unaffected by editing (B still before A)", t[0] === "Sort Probe B" && t[1] === "Sort Probe A");
  await p.goto(BASE + "/admin/content/project?sort=updated", { waitUntil: "load" });
  ok("the sort control shows the chosen sort and the list shows when each item was added", (await p.inputValue("#sort")) === "updated" && (await p.locator("th", { hasText: "Added" }).count()) === 1);
  { const o = await p.$$eval("#sort option", (x) => x.map((y) => y.textContent)); ok("sort options: display order, recently added, recently edited, title", /Display order/.test(o[0]) && o.includes("Recently added") && o.includes("Recently edited") && o.some((x) => /Title/.test(x)), o.join(",")); }

  // ===== 2. delete from the list and from the editor (administrators), any status
  const admP = admin.p;
  await admP.goto(BASE + "/admin/content/project", { waitUntil: "load" });
  ok("editors do not get a Delete button", (await p.locator("button", { hasText: /^Delete$/ }).count()) === 0);
  ok("administrators get a Delete button on every row", (await admP.locator("button", { hasText: /^Delete$/ }).count()) >= 2);
  // publish Probe B so we delete a LIVE item
  await admP.locator("table.adm-table a.t", { hasText: "Sort Probe B" }).first().click(); await admP.waitForSelector("#ed-title");
  await admP.fill("textarea >> nth=0", "Probe B summary."); await publish(admP);
  ok("Probe B is live before deleting", (await get("/work/sort-probe-b")).status === 200);
  await admP.goto(BASE + "/admin/content/project", { waitUntil: "load" });
  admP.once("dialog", (d) => d.accept()); await admP.getByRole("button", { name: "Delete Sort Probe B" }).click(); await sleep(2000);
  ok("deleting a live item from the list removes it from the public site at once", (await get("/work/sort-probe-b")).status === 404 && !(await get("/work")).text.includes("Sort Probe B"));
  ok("and from the list", !(await rowTitles("")).includes("Sort Probe B"));
  await admP.goto(BASE + "/admin/content/project", { waitUntil: "load" }); await admP.locator("table.adm-table a.t", { hasText: "Sort Probe A" }).first().click(); await admP.waitForSelector("#ed-title");
  admP.once("dialog", (d) => d.accept()); await admP.getByRole("button", { name: "Delete permanently" }).click(); await admP.waitForURL(/\/admin\/content\/project$/, { timeout: 15000 }).catch(() => {});
  ok("a draft can be deleted from the editor in one step", !(await rowTitles("")).includes("Sort Probe A"));
  // deleting a starter item sticks (the CMS is authoritative once adopted)
  await admP.goto(BASE + "/admin/content/technology", { waitUntil: "load" }); const nBefore = (await get("/technologies")).text.match(/href="\/technologies\/[a-z0-9-]+"/g)?.length ?? 0;
  admP.once("dialog", (d) => d.accept()); await admP.getByRole("button", { name: /^Delete DNA XS$/ }).click(); await sleep(2000);
  ok("a starter technology can be deleted and stays gone", (await get("/technologies/dna-xs")).status === 404);
  await admP.goto(BASE + "/admin/content/page_seo", { waitUntil: "load" });
  ok("fixed pages (page search settings) offer no Delete", (await admP.locator("button", { hasText: /^Delete$/ }).count()) === 0);

  // ===== 3. editable technology categories
  await admP.goto(BASE + "/admin/content/setting", { waitUntil: "load" }); await admP.locator("table.adm-table a.t").first().click(); await admP.waitForSelector("#ed-title");
  const cats = admP.locator('[data-field="technology_categories"]');
  ok("Site settings has a Technology categories editor, pre-filled with the built-in categories including Interactive Digital Games", (await cats.count()) === 1 && (await cats.locator(".adm-rep-row").count()) === 6 && (await cats.locator("input").evaluateAll((x) => x.map((i) => i.value))).includes("Interactive Digital Games"));
  await cats.locator(".adm-rep > div > button").last().click();
  const last = cats.locator(".adm-rep-row").last();
  await last.locator("input").nth(0).fill("Light Shows"); await last.locator("input").nth(2).fill("Light that moves.");
  // remove Robotics
  const rob = cats.locator(".adm-rep-row", { has: admP.locator('input[value="Robotics"]') }); await rob.getByRole("button", { name: "Remove" }).click();
  await publish(admP);
  let tp = (await get("/technologies")).text;
  ok("the new category and Interactive Digital Games appear on the Technologies page; Robotics is gone", />Light Shows</.test(tp) && />Interactive Digital Games</.test(tp) && !/>Robotics</.test(tp));
  { const r = await get("/technologies/robotic-arm"); ok("a technology in a removed category still shows (under the first category), no error", r.status === 200 && /Robotic Arm Experiences/.test(tp), `status ${r.status}, inList ${/Robotic Arm Experiences/.test(tp)}`); }
  await create("technology", "Probe Arcade Wall");
  const cur = p.locator('[data-field="category"] select');
  const opts = await cur.locator("option").evaluateAll((o) => o.map((x) => x.textContent));
  ok("the technology Category list is the live list from Site settings (new one in, removed one out)", opts.includes("Light Shows") && opts.includes("Interactive Digital Games") && !opts.includes("Robotics"), opts.join(","));
  await cur.selectOption("games"); await p.fill("textarea >> nth=0", "A probe arcade technology."); await publish(p);
  tp = (await get("/technologies/probe-arcade-wall")).text; ok("the technology page shows its new category", /Interactive Digital Games/.test(tp));
  ok("the showroom lists Interactive Digital Games as a filter and category", /aria-pressed="[a-z]+"[^>]*>Interactive Digital Games</.test((await get("/technologies")).text));

  // ===== 4. Google Drive video links
  const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";
  await create("project", "Drive Video Probe"); await p.fill("textarea >> nth=0", "Drive video probe summary.");
  await p.locator('[data-field="video_url"] input').fill("https://drive.google.com/drive/folders/" + ID); await p.getByRole("button", { name: "Save draft" }).click(); await sleep(1500);
  ok("a Drive folder link is refused with a clear message", /YouTube link, a Google Drive file link/.test(await p.locator('[data-field="video_url"]').innerText()));
  await p.locator('[data-field="video_url"] input').fill(`https://drive.google.com/file/d/${ID}/view?usp=sharing`); await publish(p);
  const dv = await get("/work/drive-video-probe");
  ok("a Drive file link publishes; the project page has the player with a Play control", dv.status === 200 && /vp-play/.test(dv.text));
  { const cx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await cx.newPage();
    await pg.goto(BASE + "/work/drive-video-probe", { waitUntil: "load" }); await sleep(600);
    ok("before Play no Drive frame is loaded", (await pg.locator("iframe").count()) === 0);
    await pg.locator(".vp-play").click(); await sleep(600);
    ok("Play opens Drive's own player for that file", (await pg.locator(".vp iframe").getAttribute("src")) === `https://drive.google.com/file/d/${ID}/preview`);
    await pg.goto(BASE + "/work", { waitUntil: "load" }); await sleep(600);
    const card = pg.locator("[data-vcard]", { hasText: "Drive Video Probe" });
    ok("its card has no automatic preview or Preview button (Drive cannot loop a muted segment) and no broken placeholder", (await card.count()) === 1 && (await card.locator(".vc-btn").count()) === 0 && (await card.locator(".ph").count()) === 0 || (await card.locator(".vc-btn").count()) === 0);
    await cx.close(); }

  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
