// Round 5 checks: navigation + brief, clients, testimonials, team overflow, leadership copy, company lifecycle, modal, map.
// NODE_PATH=$(npm root -g) node scripts/perf/round5-test.cjs http://localhost:3300
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3300";
const out = []; const ok = (n, c, d = "") => out.push((c ? "PASS " : "FAIL ") + n + (d ? " - " + d : ""));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const STUB = `<!doctype html><body style="margin:0;background:#123"><script>setTimeout(function(){parent.postMessage(JSON.stringify({event:'onStateChange',info:1}),'*')},300)</script>stub</body>`;
const stubYT = async (ctx) => { await ctx.route(/youtube-nocookie\.com\/embed/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: STUB })); await ctx.route(/i\.ytimg\.com/, (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG })); };
const overflow = (p) => p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errs = [];
  let ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await stubYT(ctx);
  let p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(1500);

  // ---- navigation
  const nav = await p.evaluate(() => [...document.querySelectorAll('.nav-links a, .nav-regions a')].map((a) => a.getAttribute("href")));
  ok("nav exposes Team, UAE, Saudi Arabia and Europe", ["/company/team", "/uae", "/saudi-arabia", "/europe"].every((h) => nav.includes(h)), nav.join(" "));
  await p.goto(BASE + "/company/team", { waitUntil: "domcontentloaded" }); await sleep(500);
  ok("active state: Team lit, Company not", (await p.locator('.nav-links a[aria-current="page"]').allTextContents()).join() === "Team");
  await p.goto(BASE + "/europe", { waitUntil: "domcontentloaded" }); await sleep(400);
  ok("active state: Europe lit in the region nav", (await p.locator('.nav-regions a[aria-current="page"]').textContent()) === "Europe");

  // ---- brief control + persistence
  await p.goto(BASE + "/technologies", { waitUntil: "domcontentloaded" }); await sleep(800);
  ok("brief control shows count 0", (await p.locator(".bm-n").textContent()) === "0");
  await p.locator("#browse").getByRole("button", { name: "+ Brief" }).first().click();
  await p.locator("#browse").getByRole("button", { name: "+ Brief" }).nth(0).click().catch(() => {});
  const n1 = await p.locator(".bm-n").textContent();
  await p.locator("#browse .chip", { hasText: "Brief" }).nth(2).click();
  ok("brief count updates as technologies are added", Number(await p.locator(".bm-n").textContent()) >= 1, "count " + (await p.locator(".bm-n").textContent()) + " (after first " + n1 + ")");
  const before = Number(await p.locator(".bm-n").textContent());
  await p.locator(".bm-btn").click(); await sleep(200);
  ok("panel lists the selections", (await p.locator(".bm-panel li").count()) === before);
  await p.locator(".bm-panel li button").first().click(); await sleep(200);
  ok("a selection can be removed from the panel", Number(await p.locator(".bm-n").textContent()) === before - 1);
  await p.keyboard.press("Escape"); await sleep(150);
  ok("Esc closes the panel and returns focus to the control", (await p.locator(".bm-panel").count()) === 0 && (await p.evaluate(() => document.activeElement?.className || "")).includes("bm-btn"));
  const kept = Number(await p.locator(".bm-n").textContent());
  await p.reload({ waitUntil: "domcontentloaded" }); await sleep(800);
  ok("shortlist persists across a reload", Number(await p.locator(".bm-n").textContent()) === kept);
  await p.locator(".bm-btn").click(); await p.getByRole("link", { name: /Continue to Contact/ }).click(); await p.waitForURL("**/contact**"); await sleep(900);
  ok("Continue to Contact keeps the choices in the form", (await p.locator("#brief li").count()) === kept, `${await p.locator("#brief li").count()} of ${kept}`);

  // ---- clients
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(1200);
  await p.evaluate(() => document.getElementById("clients").scrollIntoView({ block: "start" })); await sleep(700);
  ok("clients: heading 'Connected through experience.'", /Connected through experience/.test(await p.locator("#cl-h").textContent()));
  const nodes = await p.locator(".cl-node").count();
  ok("clients: a node per named client (35)", nodes === 35, String(nodes));
  ok("clients: no logo images (none supplied; none generated)", (await p.locator(".cl-node img").count()) === 0);
  await p.locator(".cl-node", { hasText: "Aramco" }).click(); await sleep(300);
  const story = await p.locator(".cl-story").textContent();
  ok("clients: selecting reveals related work, location and a link", /IKTVA/.test(story) && /Riyadh/.test(story) && (await p.locator('.cl-story a[href*="/work"]').count()) === 1, story.slice(0, 90));
  ok("clients: unconfirmed relationships are not labelled direct/agency", (await p.locator(".cl-legend").count()) === 0);
  await p.locator(".cl-node[data-on]").focus(); await p.keyboard.press("ArrowRight"); await sleep(200);
  ok("clients: arrow keys move the selection", !/Aramco/.test(await p.locator(".cl-story h3").textContent()));

  // ---- testimonials
  ok("testimonials: nothing shown by default (no published, no samples)", (await p.locator("#testimonials").count()) === 0);
  await p.goto(BASE + "/?samples=1", { waitUntil: "domcontentloaded" }); await sleep(1500);
  ok("testimonials: samples appear with ?samples=1, clearly marked fictional", (await p.locator("#testimonials").count()) === 1 && /fictional/.test(await p.locator(".tm-sample").textContent()));
  await p.evaluate(() => document.getElementById("testimonials").scrollIntoView({ block: "center" })); await sleep(500);
  const q0 = await p.locator(".tm-quote blockquote").textContent();
  await p.getByRole("button", { name: "Next testimonial" }).click(); await sleep(400);
  const q1 = await p.locator(".tm-quote blockquote").textContent();
  ok("testimonials: next arrow changes quote; speaker, role and organisation shown", q0 !== q1 && (await p.locator("figcaption").textContent()).split(",").length >= 2);
  await p.locator(".tm").focus(); await p.keyboard.press("ArrowLeft"); await sleep(300);
  ok("testimonials: keyboard arrows work", (await p.locator(".tm-quote blockquote").textContent()) === q0);
  ok("testimonials: light travels around the frame", (await p.locator(".tm-frame .nx-c").count()) >= 1);
  await sleep(5000);
  ok("testimonials: never advances by itself", (await p.locator(".tm-quote blockquote").textContent()) === q0);
  ok("testimonials: scene order Projects < Clients < Testimonials < People", await p.evaluate(() => { const y = (id) => document.getElementById(id).getBoundingClientRect().top + scrollY; return y("projects") < y("clients") && y("clients") < y("testimonials") && y("testimonials") < y("people"); }));

  // ---- team overflow + copy
  for (const w of [1348, 1500, 1024, 768]) {
    const c = await b.newContext({ viewport: { width: w, height: 900 } }); const q = await c.newPage();
    await q.goto(BASE + "/company/team", { waitUntil: "domcontentloaded" }); await sleep(900);
    const o = await overflow(q); ok(`team page: no horizontal overflow at ${w}px`, o.sw <= o.iw, `${o.sw} in ${o.iw}`);
    await c.close();
  }
  await p.goto(BASE + "/company/team", { waitUntil: "domcontentloaded" }); await sleep(900);
  const tb = await p.locator("main").textContent();
  ok("team: no unfinished 'will appear here' copy, no 'Everyone' list", !/will appear here|Everyone/.test(tb));
  ok("team: arrows and focus rings are not clipped (stage buttons inside viewport)", await p.evaluate(() => [...document.querySelectorAll(".tg-prev,.tg-next")].every((e) => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })));
  await p.getByRole("button", { name: "List", exact: true }).click(); await sleep(200);
  ok("team: Gallery/List alternative still available", (await p.locator(".tl li").count()) >= 20);
  const home = await (async () => { await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(900); return p.locator("main").textContent(); })();
  ok("home: no unfinished leadership copy", !/will appear here/.test(home));

  // ---- company lifecycle
  await p.goto(BASE + "/company", { waitUntil: "domcontentloaded" }); await sleep(800);
  const steps = await p.locator(".co-step").allTextContents();
  ok("company: seven connected lifecycle steps with icons", steps.length === 7 && (await p.locator(".co-step .ico svg").count()) === 7 && /Strategy/.test(steps[0]) && /Support/.test(steps[6]));

  // ---- map (visibility is CSS-driven)
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(1000);
  await p.evaluate(() => document.getElementById("global").scrollIntoView({ block: "start" })); await sleep(750);
  const vis = () => p.evaluate(() => ({ o: [...document.querySelectorAll('.pm-mk[data-kind="office"]')].filter((e) => getComputedStyle(e).visibility === "visible").length, pr: [...document.querySelectorAll('.pm-mk[data-kind="project"]')].filter((e) => getComputedStyle(e).visibility === "visible").length }));
  const e1 = await vis(); await sleep(2800); const e2 = await vis();
  ok("map: offices reveal first, then 17 project markers", e1.o === 3 && e1.pr === 0 && e2.pr === 17, JSON.stringify({ e1, e2 }));
  await p.locator(".pm-li", { hasText: "Riyadh" }).first().click(); await sleep(300);
  ok("map: selected marker has the pulsing selection ring", (await p.locator(".pm-mk[data-on]").count()) === 1 && (await p.evaluate(() => getComputedStyle(document.querySelector(".pm-mk[data-on] .shape"), "::after").content)) !== "none");
  await p.getByRole("button", { name: /Project locations/ }).first().click(); await sleep(900);
  ok("map: hiding the projects layer hides project markers", (await vis()).pr === 0);

  // ---- showroom (imperative)
  await p.locator(".sr-ex").nth(0).click(); await sleep(300).catch(() => {});
  ok("showroom: explanation follows the selected exhibit", await p.evaluate(() => /Touch/.test(document.querySelector(".sr-i:not([hidden]) h3").textContent)));

  // ---- hero modal
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(1500);
  await p.getByRole("button", { name: /Watch the showreel/ }).click(); await sleep(500);
  const m = await p.evaluate(() => { const r = document.querySelector("dialog[open] .reel-frame").getBoundingClientRect(); return { l: r.left, r: innerWidth - r.right, t: r.top, b: innerHeight - r.bottom }; });
  ok("modal: centred with comfortable margins", Math.abs(m.l - m.r) < 2 && Math.abs(m.t - m.b) < 2 && m.l >= 24 && m.t >= 40, JSON.stringify(m));
  ok("modal: focus moves inside the dialog", await p.evaluate(() => !!document.activeElement?.closest("dialog")));
  await p.keyboard.press("Escape"); await sleep(300);
  ok("modal: Esc closes, player unloaded, focus returns to the trigger", (await p.locator("dialog[open]").count()) === 0 && (await p.locator("dialog iframe").count()) === 0 && (await p.evaluate(() => document.activeElement?.textContent || "")).includes("Watch the showreel"));
  const sm = await b.newContext({ viewport: { width: 390, height: 600 }, hasTouch: true, isMobile: true }); await stubYT(sm);
  const sp = await sm.newPage(); await sp.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(1200);
  await sp.getByRole("button", { name: /Watch the showreel/ }).click(); await sleep(400);
  const mm = await sp.evaluate(() => { const r = document.querySelector("dialog[open] .reel-frame").getBoundingClientRect(); return { l: r.left, r: innerWidth - r.right, t: r.top, b: innerHeight - r.bottom }; });
  ok("modal (phone, short screen): inside the screen with margins", mm.l >= 20 && mm.r >= 20 && mm.t >= 20 && mm.b >= 20, JSON.stringify(mm));
  await sm.close(); await ctx.close();

  // ---- phone
  ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); await stubYT(ctx);
  p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
  for (const path of ["/", "/contact", "/company", "/company/team", "/?samples=1"]) { await p.goto(BASE + path, { waitUntil: "domcontentloaded" }); await sleep(900); const o = await overflow(p); ok(`phone ${path}: no horizontal overflow`, o.sw <= o.iw, `${o.sw}/${o.iw}`); }
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(1000);
  await p.evaluate(() => document.getElementById("clients").scrollIntoView({ block: "start" })); await sleep(500);
  const strip = await p.evaluate(() => { const u = document.querySelector(".cl-nodes"); return { scrolls: u.scrollWidth > u.clientWidth, nowrap: getComputedStyle(u).flexWrap === "nowrap" }; });
  ok("phone clients: swipeable strip with the story underneath", strip.scrolls && strip.nowrap && (await p.evaluate(() => document.querySelector(".cl-story").getBoundingClientRect().top > document.querySelector(".cl-nodes").getBoundingClientRect().top)));
  await p.getByRole("button", { name: "Menu" }).click(); await sleep(200);
  const mm2 = await p.locator("#mobile-menu").textContent();
  ok("phone menu lists Team, UAE, Saudi Arabia, Europe", ["Team", "UAE", "Saudi Arabia", "Europe"].every((t) => mm2.includes(t)));
  await ctx.close();

  ok("no uncaught page errors", errs.length === 0, errs.join(" | "));
  console.log(out.join("\n")); await b.close();
})();
