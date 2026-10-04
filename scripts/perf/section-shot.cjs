// Screenshot one homepage section at desktop and mobile. NODE_PATH=$(npm root -g) node scripts/perf/section-shot.cjs http://localhost:3300 "#capabilities" outdir name
const { chromium } = require("playwright");
const [BASE, SEL, OUT, NAME] = [process.argv[2], process.argv[3], process.argv[4], process.argv[5] || "section"];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
  for (const [n, w, h, d] of [["desktop", 1440, 900, 1], ["mobile", 390, 844, 2]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: d });
    await p.route(/youtube|ytimg/, (r) => r.abort());
    await p.goto(BASE + "/", { waitUntil: "load" });
    await p.evaluate(async () => { for (let y = 0; y < 4000; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
    await p.evaluate((s) => document.querySelector(s).scrollIntoView(), SEL); await p.waitForTimeout(1500);
    await (await p.$(SEL)).screenshot({ path: `${OUT}/${n}-${NAME}.png` }); await p.close();
  }
  await b.close();
})();
