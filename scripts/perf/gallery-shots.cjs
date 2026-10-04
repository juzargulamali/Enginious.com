// Viewport screenshots of the showroom and team galleries (home + /company/team). NODE_PATH=$(npm root -g) node scripts/perf/gallery-shots.cjs http://localhost:3300 outdir
const { chromium } = require("playwright");
const [BASE, OUT] = [process.argv[2], process.argv[3]];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TARGETS = [["home-showroom", "/", ".sr-stage"], ["home-team", "/", ".tg-stage"], ["team-page", "/company/team", ".tg-stage"]];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
  for (const [n, w, h, d, mobile] of [["desktop", 1440, 900, 1, false], ["desktop-1920", 1920, 1080, 1, false], ["tablet-768", 768, 1024, 2, true], ["mobile-430", 430, 932, 2, true], ["mobile-390", 390, 844, 2, true]]) {
    for (const [name, path, sel] of TARGETS) {
      if (name === "home-showroom" && n !== "desktop" && n !== "mobile-390") continue;
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: d, hasTouch: mobile, isMobile: mobile });
      const p = await ctx.newPage(); await p.route(/youtube|ytimg/, (r) => r.abort());
      await p.goto(BASE + path, { waitUntil: "load" });
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 800) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
      for (let k = 0; k < 3; k++) { await p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); scrollTo(0, scrollY + r.top - innerHeight * 0.12 - 30); }, sel); await sleep(700); }
      await p.mouse.move(w / 2, 20); await sleep(400);
      await p.screenshot({ path: `${OUT}/${n}-${name}.png` });
      await ctx.close();
    }
  }
  await b.close();
})();
