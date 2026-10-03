// Screenshots of the homepage scenes. NODE_PATH=$(npm root -g) node scripts/perf/shots2.cjs http://localhost:3300 /tmp/out
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
    p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 140)));
    p.on("pageerror", (e) => errs.push("PAGEERR " + e.message.slice(0, 140)));
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(2500);
    await p.screenshot({ path: `${OUT}/${v.n}-0-hero.png` });
    const secs = p.locator(".scenes > section");
    const n = await secs.count();
    for (let i = 0; i < n; i++) {
      await secs.nth(i).scrollIntoViewIfNeeded(); await p.evaluate((i) => document.querySelectorAll(".scenes > section")[i].scrollIntoView({ block: "start" }), i); await sleep(700);
      await p.screenshot({ path: `${OUT}/${v.n}-${i + 1}-scene.png` });
    }
    await ctx.close();
  }
  console.log("console errors:", JSON.stringify(errs));
  await b.close();
})();
