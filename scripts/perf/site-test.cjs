// Site-wide basics: indexing rules, sitemap, skip link, nav, mobile menu, every route loads. NODE_PATH=$(npm root -g) node scripts/perf/site-test.cjs
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3300";
const out = []; const ok = (n, c, d = "") => out.push((c ? "PASS " : "FAIL ") + n + (d ? " - " + d : ""));
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await ctx.newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  let r = await p.goto(BASE + "/robots.txt"); ok("robots disallows all", (await r.text()).includes("Disallow: /"));
  r = await p.goto(BASE + "/work"); ok("X-Robots-Tag noindex", /noindex/.test(r.headers()["x-robots-tag"] || ""));
  ok("meta robots noindex", ((await p.locator("meta[name=robots]").getAttribute("content")) || "").includes("noindex"));
  r = await p.goto(BASE + "/sitemap.xml"); ok("sitemap 200", r.status() === 200);
  for (const path of ["/", "/work", "/work/whx", "/technologies", "/technologies/tri-helix", "/solutions", "/company", "/company/team", "/europe", "/uae", "/saudi-arabia", "/insights", "/careers", "/contact", "/privacy"]) {
    const res = await p.goto(BASE + path, { waitUntil: "domcontentloaded" }); ok(`route ${path} loads`, res.status() === 200);
  }
  await p.goto(BASE + "/work"); await p.keyboard.press("Tab"); ok("skip link is first focus", await p.evaluate(() => document.activeElement?.textContent?.includes("Skip")));
  const m = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const q = await m.newPage();
  await q.goto(BASE + "/work"); await q.getByRole("button", { name: "Menu" }).click(); ok("mobile menu opens", (await q.locator("#mobile-menu").count()) === 1);
  await q.keyboard.press("Escape"); ok("Escape closes menu", (await q.locator("#mobile-menu").count()) === 0);
  ok("no uncaught errors", errs.length === 0, errs.join(" | "));
  console.log(out.join("\n")); await b.close();
})();
