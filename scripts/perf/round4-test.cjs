// Checks for round 4: map, people gallery, company/contact, scroll choreography. NODE_PATH=$(npm root -g) node scripts/perf/round4-test.cjs http://localhost:3300
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3300";
const out = []; const ok = (n, c, d = "") => out.push((c ? "PASS " : "FAIL ") + n + (d ? " - " + d : ""));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errs = [];
  let ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  let p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(1800);

  // hero regional strip visible in first viewport and clickable
  const strip = await p.evaluate(() => { const r = document.querySelector(".rs").getBoundingClientRect(); const t = document.querySelector(".rs").textContent; return { inView: r.bottom <= innerHeight && r.top >= 0, t }; });
  ok("hero: Dubai / Riyadh / Poland strip fully inside first viewport", strip.inView && /Dubai.*Global Headquarters/.test(strip.t) && /Riyadh.*Saudi Arabia Branch/.test(strip.t) && /Poland.*Europe/.test(strip.t), strip.t);
  ok("hero: three regional destinations are links", (await p.locator('.rs a[href="/uae"], .rs a[href="/saudi-arabia"], .rs a[href="/europe"]').count()) === 3);

  // capabilities reveal as light reaches them
  await p.evaluate(() => document.getElementById("capabilities").scrollIntoView({ block: "start" })); await sleep(1200);
  const rev = await p.evaluate(() => [...document.querySelectorAll(".pc2")].map((e) => e.hasAttribute("data-reached")));
  ok("capabilities: cards light up progressively as the light reaches them", rev[0] === true, JSON.stringify(rev));
  await p.evaluate(() => window.scrollBy(0, 500)); await sleep(900);
  ok("capabilities: later cards reveal after further scroll", (await p.evaluate(() => [...document.querySelectorAll(".pc2")].every((e) => e.hasAttribute("data-reached")))));

  // tower progresses with scroll; manual wins
  const val = () => p.locator(".tw-scene").getAttribute("aria-valuenow");
  const y0 = await p.evaluate(() => document.getElementById("engineering").getBoundingClientRect().top + scrollY);
  const seen = new Set();
  for (let y = y0 - 700; y < y0 + 900; y += 90) { await p.evaluate((y) => window.scrollTo(0, y), y); await sleep(260); seen.add(await val()); }
  ok("tower: scrolling through the section visits Idea, Engineering and Experience", seen.has("0") && seen.has("1") && seen.has("2"), [...seen].join(","));
  await p.evaluate((y) => window.scrollTo(0, y), y0 + 100); await sleep(500);
  await p.locator(".tw-scene").focus(); await p.keyboard.press("Home"); await sleep(900);
  await p.evaluate((y) => window.scrollTo(0, y + 160), y0 + 100); await sleep(1100);
  ok("tower: manual control is respected while scrolling", (await val()) === "0", "value " + (await val()));
  await p.getByRole("button", { name: /^03\s*Experience/ }).click(); await sleep(900);
  ok("tower: stage buttons still work", (await val()) === "2");

  // showroom: scroll steps exhibits
  const s0 = await p.evaluate(() => document.getElementById("technology").getBoundingClientRect().top + scrollY);
  const act = new Set();
  for (let y = s0 - 500; y < s0 + 800; y += 80) { await p.evaluate((y) => window.scrollTo(0, y), y); await sleep(220); act.add(await p.locator('.sr-ex[data-on="true"] .sr-lbl').textContent()); }
  ok("showroom: scrolling brings different exhibits forward", act.size >= 3, [...act].join(" | "));
  await p.locator(".sr-ex").nth(0).click(); await sleep(300);
  const first = await p.evaluate(() => document.querySelector(".sr-i:not([hidden]) h3").textContent);
  ok("showroom: explanation follows the selected exhibit", /Touch/.test(first), first);

  // evidence scale-up
  const e0 = await p.evaluate(() => document.getElementById("projects").getBoundingClientRect().top + scrollY);
  await p.evaluate((y) => window.scrollTo(0, y), e0 - 300); await sleep(500);
  const sA = await p.evaluate(() => getComputedStyle(document.querySelector(".film-grow")).transform);
  await p.evaluate((y) => window.scrollTo(0, y), e0 + 450); await sleep(600);
  const sB = await p.evaluate(() => getComputedStyle(document.querySelector(".film-grow")).transform);
  ok("evidence: media frame grows as the reader arrives", sA !== sB, `${sA.slice(0, 22)} -> ${sB.slice(0, 22)}`);

  // map
  await p.evaluate(() => document.getElementById("global").scrollIntoView({ block: "start" })); await sleep(750);
  const early = await p.evaluate(() => ({ o: [...document.querySelectorAll('.pm-mk[data-kind="office"]')].filter((e) => getComputedStyle(e).visibility === "visible").length, pr: [...document.querySelectorAll('.pm-mk[data-kind="project"]')].filter((e) => getComputedStyle(e).visibility === "visible").length }));
  await sleep(2600);
  const late = await p.evaluate(() => ({ o: [...document.querySelectorAll('.pm-mk[data-kind="office"]')].filter((e) => getComputedStyle(e).visibility === "visible").length, pr: [...document.querySelectorAll('.pm-mk[data-kind="project"]')].filter((e) => getComputedStyle(e).visibility === "visible").length }));
  ok("map: reveals offices first, then project locations", early.o === 3 && early.pr === 0 && late.pr === 17, JSON.stringify({ early, late }));
  ok("map: 3 offices + 17 project markers (19 project locations incl. Dubai and Riyadh offices)", late.o === 3 && late.pr === 17);
  const names = await p.locator(".pm-list .pm-cols .pm-li b").allTextContents();
  const want = ["Dubai", "Abu Dhabi", "Muscat", "Doha", "Bahrain", "Kuwait", "Riyadh", "Jeddah", "Hannover", "Vienna", "Amsterdam", "Miami", "Brazil", "Baku", "Barcelona", "Paris", "London", "Las Vegas", "Shanghai"];
  ok("map: list contains exactly the 19 supplied project locations", want.every((n) => names.includes(n)) && names.length === 19, names.length + " listed");
  ok("map: Poland office is country-level (dashed, no city)", (await p.locator('.pm-mk[data-kind="office"][data-precision="country"]').count()) === 1 && (await p.locator('.pm-mk[data-precision="country"]').count()) === 4);
  await p.locator('.pm-mk[data-kind="project"][aria-label^="Riyadh"]').first().click().catch(() => {});
  await p.locator(".pm-li", { hasText: "Riyadh" }).first().click(); await sleep(400);
  const panel = await p.locator(".pm-panel").textContent();
  ok("map: Riyadh panel shows BOTH the office and project status plus related work", /Saudi Arabia Branch/.test(panel) && /Project location/.test(panel) && /Global Health Exhibition/.test(panel), panel.slice(0, 120));
  await p.locator(".pm-li", { hasText: "Kuwait" }).click(); await sleep(300);
  ok("map: country-level Kuwait says so and has no invented work", /country level/.test(await p.locator(".pm-panel").textContent()) && /being added/.test(await p.locator(".pm-panel").textContent()));
  await p.locator(".pm-li", { hasText: "Brazil" }).click(); await sleep(300);
  ok("map: Brazil shows COP30 only", /COP30/.test(await p.locator(".pm-panel").textContent()));
  await p.getByRole("button", { name: "Gulf", exact: true }).click(); await sleep(1200);
  ok("map: Gulf zoom changes the view", /scale\((?!1\))/.test((await p.locator(".pm-stage").getAttribute("style")) || ""));
  await p.getByRole("button", { name: /Project locations/ }).first().click(); await sleep(900);
  ok("map: project layer can be switched off", (await p.locator('.pm-mk[data-kind="project"]').first().evaluate((e) => getComputedStyle(e).visibility)) === "hidden");
  await p.locator('.pm-mk[data-kind="office"]').first().focus(); await p.keyboard.press("Enter"); await sleep(200);
  ok("map: markers are keyboard-operable buttons", (await p.locator(".pm-panel h3").textContent()).length > 0);

  // people on home
  await p.evaluate(() => document.getElementById("people").scrollIntoView({ block: "start" })); await sleep(1500);
  ok("people: Juzar's photo is the first, selected card", (await p.locator('.tg-card[data-active="true"] img.photo').count()) === 1 && /juzar-gulamali/.test((await p.locator('.tg-card[data-active="true"] img.photo').getAttribute("src")) || ""));
  const a0 = await p.locator('.tg-card[data-active="true"]').getAttribute("aria-label");
  await sleep(4000);
  ok("people: never rotates by itself", (await p.locator('.tg-card[data-active="true"]').getAttribute("aria-label")) === a0);
  await p.locator('.tg-card[data-active="true"]').focus(); await p.keyboard.press("ArrowLeft"); await sleep(300);
  ok("people: ArrowLeft wraps around the ring", /Gulalai|Aswathi|Dennis|Tasneem|Lubna/.test((await p.locator('.tg-card[data-active="true"]').getAttribute("aria-label")) || ""));
  await p.getByRole("button", { name: "Leadership", exact: true }).click(); await sleep(300);
  ok("people: filter leaves the two leaders", (await p.locator(".tg-card").count()) === 2);
  const prof = await p.locator(".tg-profile").textContent();
  ok("people: profile shows responsibilities; unapproved message is not shown", /Responsibilities|direction|leadership/i.test(prof) && !/will appear here/.test(prof));
  await p.getByRole("button", { name: "List", exact: true }).click(); await sleep(200);
  ok("people: list view is the single alternative (gallery hidden)", (await p.locator(".tl li").count()) === 2 && (await p.locator(".tg-stage").count()) === 0);

  // light path finish
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await sleep(1500);
  ok("finish: the light path reaches the enquiry invitation", (await p.locator(".final[data-reached]").count()) === 1 && (await p.locator(".final-link").count()) === 1);

  // team page: exactly one team representation
  await p.goto(BASE + "/company/team", { waitUntil: "domcontentloaded" }); await sleep(900);
  const body = await p.locator("main").textContent();
  ok("team page: no duplicate 'Everyone' list", !/Everyone/.test(body) && (await p.locator(".tl, .tech-grid").count()) === 0);
  ok("team page: one gallery only", (await p.locator(".tg-stage").count()) === 1);

  // company page
  await p.goto(BASE + "/company", { waitUntil: "domcontentloaded" }); await sleep(900);
  const cb = await p.locator("main").textContent();
  ok("company: story, mission, vision, how-it-works, capabilities, leadership, global operations", ["Our story", "Mission", "Vision", "How Enginious works", "Capabilities", "Leadership", "Global operations"].every((t) => new RegExp(t, "i").test(cb)));
  ok("company: seven-step lifecycle", (await p.locator(".co-step").count()) === 7);
  ok("company: no invented awards/certifications", !/award|certif|ISO \d|ranked|#1/i.test(cb));

  // contact
  await p.goto(BASE + "/contact?tech=tri-helix", { waitUntil: "domcontentloaded" }); await sleep(1200);
  ok("contact: shortlist carried into the form", (await p.locator("#brief li").count()) === 1);
  await p.locator(".ct-reg", { hasText: "Saudi Arabia" }).click(); await sleep(300);
  const side = await p.locator(".ct-side-d").textContent();
  ok("contact: region card updates emphasis, details and destination", (await p.locator('.ct-reg[data-on="true"]').textContent()).includes("Saudi") && /Saudi Arabia Branch/.test(side) && /lubna@enginious\.ae/.test(side));
  await p.locator(".ct-reg", { hasText: "Poland" }).click(); await sleep(300);
  ok("contact: Poland falls back to the general contact (no invented Poland details)", /info@enginious\.ae/.test(await p.locator(".ct-side-d").textContent()));
  ok("contact: optional private attachment input with stated limits (storage built in Milestone 2)", (await p.locator('input[type="file"]').count()) === 1 && /4 MB/.test(await p.locator("#files-help").textContent()));
  await p.getByRole("button", { name: /Send enquiry/ }).click(); await sleep(700);
  ok("contact: validation errors show", (await p.locator(".err").count()) >= 3);
  await p.fill("#name", "Test"); await p.fill("#email", "t@example.com"); await p.fill("#message", "Planning a stand in Warsaw next spring.");
  await p.getByRole("button", { name: /Send enquiry/ }).click(); await sleep(1200);
  ok("contact: no false success when the backend is unavailable; input kept", (await p.getByText("Enquiry received").count()) === 0 && (await p.inputValue("#name")) === "Test");
  await ctx.close();

  // reduced motion
  ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  p = await ctx.newPage(); await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(1200);
  await p.evaluate(() => document.getElementById("capabilities").scrollIntoView()); await sleep(600);
  ok("reduced motion: capabilities fully revealed", (await p.locator(".pc2[data-reached]").count()) === 3, (await p.locator(".pc2[data-reached]").count()) + " revealed");
  await p.evaluate(() => document.getElementById("global").scrollIntoView()); await sleep(500);
  ok("reduced motion: map shows offices and projects immediately", (await p.evaluate(() => [...document.querySelectorAll(".pm-mk")].filter((e) => getComputedStyle(e).visibility === "visible").length)) === 20);
  await ctx.close();

  // phone
  ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(1800);
  const m = await p.evaluate(() => { const s = document.querySelector(".rs").getBoundingClientRect(); const h = document.querySelector(".rh-copy h1").getBoundingClientRect(); return { stripIn: s.bottom <= innerHeight, h1Below: h.top >= s.bottom - 2, overflow: document.documentElement.scrollWidth > innerWidth + 1 }; });
  ok("phone: regional strip inside the first screen, headline below it, no overflow", m.stripIn && m.h1Below && !m.overflow, JSON.stringify(m));
  for (const path of ["/contact", "/company", "/company/team"]) { await p.goto(BASE + path, { waitUntil: "domcontentloaded" }); await sleep(800); ok(`phone: ${path} no horizontal overflow`, !(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))); }
  await p.goto(BASE + "/contact", { waitUntil: "domcontentloaded" }); await sleep(800);
  const order = await p.evaluate(() => { const r = document.querySelector(".ct-regions").getBoundingClientRect().top; const f = document.querySelector(".ct-form").getBoundingClientRect().top; const d = document.querySelector("details.ct-acc").getBoundingClientRect().top; return r < f && f < d; });
  ok("phone contact: regions first, then form, then expandable details", order);
  await ctx.close();
  ok("no uncaught page errors", errs.length === 0, errs.join(" | "));
  console.log(out.join("\n")); await b.close();
})();
