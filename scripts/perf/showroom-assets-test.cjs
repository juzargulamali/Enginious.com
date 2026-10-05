/*
 * Showroom supplied assets (static / animated). Needs a build where, in the showroom: touch-and-throw has nothing, holofan has a PNG only,
 * tri-helix has a resting pose plus an animated WebP, robotic-arm a static WebP, ai-photobooth a broken static URL, circular-dial a pose with a broken
 * animation URL. See scripts/perf/showroom-test-assets.py (clearly labelled "TEST ASSET" images; never commit them).
 * NODE_PATH=$(npm root -g) node scripts/perf/showroom-assets-test.cjs http://localhost:3300 [outdir]
 */
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3300"; const OUT = process.argv[3];
const out = []; const ok = (n, c, d = "") => out.push((c ? "PASS " : "FAIL ") + n + (d ? " - " + d : ""));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const IDX = { touch: 0, holofan: 1, tri: 2, robot: 3, booth: 4, dial: 5 };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
  const open = async (opts = {}, view = [1440, 900]) => {
    const ctx = await b.newContext({ viewport: { width: view[0], height: view[1] }, ...opts });
    await ctx.route(/youtube|ytimg/, (r) => r.abort());
    const p = await ctx.newPage(); await p.goto(BASE + "/", { waitUntil: "load" });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 800) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
    for (let k = 0; k < 3; k++) { await p.evaluate(() => { const r = document.querySelector(".sr-stage").getBoundingClientRect(); scrollTo(0, scrollY + r.top - 90); }); await sleep(700); }
    await sleep(800);
    return { ctx, p };
  };
  const ex = (p, i) => p.evaluate((i) => { const e = document.querySelectorAll(".sr-ex")[i]; const fig = e.querySelector(".sr-art .sr-fig"); const cut = fig?.querySelector(".sr-cut"); const svg = e.querySelector(".sr-art > svg"); const anim = e.querySelector(".sr-anim"); return { on: e.dataset.on, media: e.dataset.media || "none", svg: svg ? getComputedStyle(svg).display !== "none" : false, fig: fig ? getComputedStyle(fig).display !== "none" : false, cutLoaded: cut ? cut.naturalWidth > 0 : null, cutVisible: cut ? getComputedStyle(cut).visibility !== "hidden" : null, fit: cut ? getComputedStyle(cut).objectFit : null, anim: !!anim, animReady: fig?.dataset.anim === "ready", labelOpacity: +getComputedStyle(e.querySelector(".sr-lbl")).opacity }; }, i);
  const animCount = (p) => p.evaluate(() => document.querySelectorAll(".sr-anim").length);
  const step = async (p, n) => { for (let k = 0; k < Math.abs(n); k++) await p.click(n > 0 ? '[aria-label="Next exhibit"]' : '[aria-label="Previous exhibit"]'); };

  { const { ctx, p } = await open();
    await sleep(1200);
    const t = await ex(p, IDX.tri), h = await ex(p, IDX.holofan), r = await ex(p, IDX.robot), bo = await ex(p, IDX.booth), tt = await ex(p, IDX.touch), d = await ex(p, IDX.dial);
    ok("PNG only: shown as a contained image, drawing hidden, never animated", h.media === "loaded" && h.cutLoaded && h.fit === "contain" && !h.svg && !h.anim, JSON.stringify(h));
    ok("static WebP only works the same way", r.media === "loaded" && r.cutLoaded && r.fit === "contain" && !r.svg && !r.anim, JSON.stringify(r));
    ok("PNG + animation: selected exhibit plays the animation (resting pose hidden)", t.on === "true" && t.animReady && t.cutVisible === false && !t.svg, JSON.stringify(t));
    ok("neighbours show the resting pose, no animation", !h.anim && !r.anim && (await animCount(p)) === 1);
    ok("missing media keeps the designed line drawing", tt.media === "none" && tt.svg && !tt.fig, JSON.stringify(tt));
    ok("broken static URL: drawing returns, no broken-image icon", bo.media === "failed" && bo.svg && !bo.fig, JSON.stringify(bo));
    ok("neighbour names stay readable", [h, r, bo, tt].every((x) => x.labelOpacity >= 0.95), [h, r, bo, tt].map((x) => x.labelOpacity).join(","));
    // same box and position for resting image and animation (no size/position jump)
    const same = await p.evaluate((i) => { const e = document.querySelectorAll(".sr-ex")[i]; const a = e.querySelector(".sr-anim").getBoundingClientRect(); const c = e.querySelector(".sr-cut").getBoundingClientRect(); return { dw: Math.abs(a.width - c.width), dh: Math.abs(a.height - c.height), dx: Math.abs(a.x - c.x), dy: Math.abs(a.y - c.y) }; }, IDX.tri);
    ok("resting image and animation share size and position", Object.values(same).every((v) => v < 0.6), JSON.stringify(same));
    // the animation really moves (frames differ)
    const f1 = await p.screenshot({ clip: { x: 640, y: 380, width: 160, height: 180 } }); await sleep(260); const f2 = await p.screenshot({ clip: { x: 640, y: 380, width: 160, height: 180 } });
    ok("the animation is actually animating", !f1.equals(f2));
    // leaving the centre: back to the resting pose, no animation element left
    await step(p, 1); await sleep(900);
    const t2 = await ex(p, IDX.tri), r2 = await ex(p, IDX.robot);
    ok("leaving the centre returns to the resting pose", !t2.anim && t2.cutVisible === true && t2.on === "false", JSON.stringify(t2));
    ok("static-only exhibit that becomes selected does not animate", r2.on === "true" && !r2.anim, JSON.stringify(r2));
    // broken animation URL: stays on the resting pose, no leftover element
    await step(p, 2); await sleep(1500);
    const d2 = await ex(p, IDX.dial);
    ok("broken animation URL: stays on the resting pose gracefully", d2.on === "true" && !d2.animReady && d2.cutVisible === true && !d2.svg, JSON.stringify(d2));
    // rapid navigation: never more than one animation mounted, none left on the wrong exhibit
    await p.evaluate(() => { window.__max = 0; window.__obs = new MutationObserver(() => { window.__max = Math.max(window.__max, document.querySelectorAll(".sr-anim").length); }); window.__obs.observe(document.querySelector(".sr-stage"), { childList: true, subtree: true }); });
    for (let k = 0; k < 24; k++) await p.evaluate((k) => document.querySelector(k % 3 === 0 ? '[aria-label="Previous exhibit"]' : '[aria-label="Next exhibit"]').click(), k);
    while ((await p.evaluate(() => [...document.querySelectorAll(".sr-ex")].findIndex((e) => e.dataset.on === "true"))) !== IDX.tri) await p.evaluate(() => document.querySelector('[aria-label="Next exhibit"]').click());
    await sleep(1800);
    const fin = await p.evaluate(() => ({ max: window.__max, on: [...document.querySelectorAll(".sr-ex")].findIndex((e) => e.dataset.on === "true"), anims: [...document.querySelectorAll(".sr-ex")].map((e) => !!e.querySelector(".sr-anim")) }));
    ok("rapid selection: at most one animation mounted at any moment", fin.max === 1, "max " + fin.max);
    ok("rapid selection: it ends playing on the selected exhibit only", fin.on === IDX.tri && fin.anims.filter(Boolean).length === 1 && fin.anims[fin.on], JSON.stringify(fin));
    // back to tri-helix, then scroll away and back
    while ((await p.evaluate(() => [...document.querySelectorAll(".sr-ex")].findIndex((e) => e.dataset.on === "true"))) !== IDX.tri) await step(p, 1);
    await sleep(1200); const before = await animCount(p);
    await p.evaluate(() => document.querySelector("#capabilities").scrollIntoView()); await sleep(900);
    const away = await animCount(p);
    await p.evaluate(() => { const r = document.querySelector(".sr-stage").getBoundingClientRect(); scrollTo(0, scrollY + r.top - 90); }); await sleep(1500);
    const back = await animCount(p);
    ok("off-screen: animation is unmounted, and plays again on return", before === 1 && away === 0 && back === 1, `${before}/${away}/${back}`);
    if (OUT) { await p.mouse.move(720, 8); await p.screenshot({ path: `${OUT}/desktop-showroom-assets.png` }); }
    await ctx.close(); }

  { const { ctx, p } = await open({ reducedMotion: "reduce" }); await sleep(1500);
    const t = await ex(p, IDX.tri);
    ok("reduced motion: resting pose only, never the animation", !t.anim && t.cutVisible === true && (await animCount(p)) === 0, JSON.stringify(t));
    await ctx.close(); }

  { const { ctx, p } = await open({ hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, [390, 844]); await sleep(1500);
    ok("mobile: no horizontal overflow", (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    const t = await ex(p, IDX.tri);
    ok("mobile: selected exhibit shows its animation, drawing hidden", t.animReady && !t.svg, JSON.stringify(t));
    if (OUT) { await p.mouse.move(195, 8); await p.screenshot({ path: `${OUT}/mobile-showroom-assets.png` }); }
    await ctx.close(); }
  console.log(out.join("\n")); await b.close();
})();
