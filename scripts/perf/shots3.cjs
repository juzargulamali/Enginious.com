// Page screenshots. NODE_PATH=$(npm root -g) node scripts/perf/shots3.cjs http://localhost:3300 /tmp/out
const { chromium } = require("playwright");
const [, , BASE = "http://localhost:3300", OUT = "/tmp/shots"] = process.argv;
require("fs").mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errs = [];
  for (const v of [{ n: "desktop", w: 1440, h: 900, dpr: 1 }, { n: "mobile", w: 390, h: 844, dpr: 2, touch: true }]) {
    const ctx = await b.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, hasTouch: !!v.touch, isMobile: !!v.touch });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errs.push("PAGEERR " + e.message.slice(0, 160)));
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(2200);
    await p.screenshot({ path: `${OUT}/${v.n}-home-0-hero.png` });
    const ids = ["capabilities", "engineering", "technology", "projects", "clients", "people", "global"];
    for (const [i, id] of ids.entries()) {
      await p.evaluate((id) => document.getElementById(id).scrollIntoView({ block: "start" }), id); await sleep(1400);
      if (id === "global") await sleep(2200);
      await p.screenshot({ path: `${OUT}/${v.n}-home-${i + 1}-${id}.png` });
    }
    await p.goto(BASE + "/?samples=1", { waitUntil: "domcontentloaded" }); await sleep(1500);
    if (await p.locator("#testimonials").count()) { await p.evaluate(() => window.scrollTo({ top: document.getElementById("testimonials").getBoundingClientRect().top + scrollY - 110, behavior: "instant" })); await sleep(1500); await p.screenshot({ path: `${OUT}/${v.n}-home-testimonials-samples.png` }); }
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await sleep(1500);
    await p.screenshot({ path: `${OUT}/${v.n}-home-7-end.png` });
    for (const [name, path] of [["contact", "/contact"], ["company", "/company"], ["team", "/company/team"]]) {
      await p.goto(BASE + path, { waitUntil: "domcontentloaded" }); await sleep(1500);
      await p.screenshot({ path: `${OUT}/${v.n}-${name}.png`, fullPage: name !== "team" });
    }
    await ctx.close();
  }
  console.log("errors:", JSON.stringify(errs));
  await b.close();
})();
