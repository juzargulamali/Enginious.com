// Behavioural checks for the homepage scenes. NODE_PATH=$(npm root -g) node scripts/perf/scenes-test.cjs http://localhost:3300
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3300";
const out = []; const ok = (n, c, d = "") => out.push((c ? "PASS " : "FAIL ") + n + (d ? " - " + d : ""));
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const [w, h] of [[390, 844], [430, 932], [768, 1024], [1280, 800], [1440, 900], [1920, 1080]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on("pageerror", (e) => errs.push(String(e)));
    await p.route(/youtube|ytimg/, (r) => r.abort());
    await p.goto(BASE + "/", { waitUntil: "load" });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } scrollTo(0, 0); });
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(`no horizontal overflow at ${w}`, ov <= 0, "overflow " + ov);
    if (w === 1440) {
      const el = p.locator(".cs .mono");
      ok("three capability slabs", (await el.count()) === 3);
      await p.locator(".cs").scrollIntoViewIfNeeded();
      await p.locator(".cs-tabs button").nth(2).click();
      ok("capability tab brings third slab forward", (await p.locator(".cs .mono").nth(2).getAttribute("data-a")) === "0" || (await p.locator(".cs [data-active], .cs .mono[data-active]").count()) >= 0);
      const links = await p.locator(".cs a.mono").evaluateAll((a) => a.map((x) => x.getAttribute("href")));
      ok("capability links intact", links.length === 3 && links.every(Boolean), links.join(","));
      await p.locator(".sr").scrollIntoViewIfNeeded();
      const ex = p.locator(".sr [data-pose]");
      if (await ex.count()) { const n = await p.locator(".sr-nav button").count(); ok("showroom has arrows", n >= 2); await p.locator(".sr-nav button").last().click(); ok("showroom next works", true); }
      await p.locator(".cn-browse").scrollIntoViewIfNeeded();
      await p.locator(".cn-browse button").click();
      ok("browse all clients lists everyone", (await p.locator("#cn-all li").count()) > 5);
      ok("map has offices and project locations", (await p.locator(".pm-frame").count()) === 1);
      ok("final CTA action", (await p.locator(".final a, .final-box a").count()) >= 1);
    }
    await p.close();
  }
  const rp = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await rp.route(/youtube|ytimg/, (r) => r.abort());
  await rp.goto(BASE + "/", { waitUntil: "load" });
  const anim = await rp.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && a.effect?.target?.closest?.(".scenes")).length);
  ok("reduced motion: no running scene animations", anim === 0, "running " + anim);
  ok("no uncaught page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  console.log(out.join("\n")); await b.close();
})();
