// Screenshots + behavioural checks for the homepage benchmark.
// NODE_PATH=$(npm root -g) node scripts/perf/shots.cjs http://localhost:3300 /tmp/out
const { chromium } = require("playwright");
const [, , BASE = "http://localhost:3300", OUT = "/tmp/shots"] = process.argv;
require("fs").mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errs = [];
  const watch = (p) => { p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 160))); p.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 160))); };
  for (const v of [{ n: "desktop", w: 1440, h: 900, dpr: 1 }, { n: "mobile", w: 390, h: 844, dpr: 2, touch: true }]) {
    const ctx = await b.newContext({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dpr, hasTouch: !!v.touch, isMobile: !!v.touch });
    const p = await ctx.newPage(); watch(p);
    await p.goto(BASE + "/", { waitUntil: "networkidle" }); await sleep(900);
    await p.screenshot({ path: `${OUT}/${v.n}-hero-experience.png` });
    for (const [i, name] of ["idea", "engineering"].entries()) {
      await p.locator(".step").nth(i).click(); await sleep(1500);
      await p.screenshot({ path: `${OUT}/${v.n}-hero-${name}.png` });
    }
    await p.locator(".step").nth(2).click(); await sleep(1200);
    // content-visibility hides offscreen sections again once scrolled away, so capture each section on its own.
    const secs = p.locator("main > section, main > .hero");
    const n = await secs.count();
    for (let i = 1; i < n; i++) {
      await secs.nth(i).scrollIntoViewIfNeeded(); await sleep(350);
      await secs.nth(i).screenshot({ path: `${OUT}/${v.n}-section-${i}.png` });
    }
    await ctx.close();
  }
  // reduced motion + no-JS fallbacks (desktop)
  const rm = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const rp = await rm.newPage(); watch(rp); await rp.goto(BASE + "/", { waitUntil: "networkidle" }); await sleep(600);
  await rp.screenshot({ path: `${OUT}/desktop-reduced-motion.png` }); await rm.close();
  const nj = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const np = await nj.newPage(); await np.goto(BASE + "/", { waitUntil: "load" }); await sleep(500);
  await np.screenshot({ path: `${OUT}/desktop-no-javascript.png` }); await nj.close();
  console.log("console errors:", JSON.stringify(errs));
  await b.close();
})();
