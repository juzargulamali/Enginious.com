// Per-scene scroll profile. Scrolls across ONE scene at a time (same wheel pattern as the benchmark) at CPU x4 and reports cost.
// NODE_PATH=$(npm root -g) node scripts/perf/scene-profile.cjs --base http://localhost:3300 --out docs/perf/scenes-before.json [--css file.css] [--runs 3] [--view mobile]
const { chromium } = require("playwright");
const fs = require("fs");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://localhost:3300");
const OUT = arg("out", null);
const RUNS = +arg("runs", 3);
const RATE = +arg("rate", 4);
const VIEW = arg("view", "desktop");
const CSS = arg("css", null) ? fs.readFileSync(arg("css"), "utf8") : null;
const W = VIEW === "mobile" ? 390 : 1440, H = VIEW === "mobile" ? 844 : 900;
const ONLY = arg("scenes", null);
const SCENES = (ONLY ? ONLY.split(",") : ["hero", "capabilities", "engineering", "technology", "projects", "clients", "testimonials", "people", "global", "final"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const r1 = (x) => Math.round(x * 10) / 10;

const INIT = () => {
  window.__commits = 0; window.__frames = []; window.__rec = false;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { supportsFiber: true, renderers: new Map(), isDisabled: false, inject(r) { this.renderers.set(1, r); return 1; }, onCommitFiberRoot() { window.__commits++; }, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {} };
  const loop = (t) => { if (window.__rec) window.__frames.push(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};
const metrics = async (cdp) => { const { metrics } = await cdp.send("Performance.getMetrics"); const o = {}; metrics.forEach((m) => (o[m.name] = m.value)); return o; };

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const acc = {};
  for (let run = 0; run < RUNS; run++) {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: VIEW === "mobile" ? 2 : 1, hasTouch: VIEW === "mobile", isMobile: VIEW === "mobile" });
    await ctx.addInitScript(INIT);
    if (CSS) await ctx.addInitScript((css) => document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }), CSS);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Performance.enable");
    await page.goto(BASE + "/", { waitUntil: "networkidle" }); await sleep(1500);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
    for (const id of SCENES) {
      const geo = await page.evaluate((id) => {
        const el = id === "hero" ? document.querySelector(".rh") : document.getElementById(id) || document.querySelector("." + id);
        if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height };
      }, id);
      if (!geo) continue;
      await page.evaluate((y) => window.scrollTo(0, Math.max(0, y)), geo.top - 700); await sleep(900);
      await page.evaluate(() => { window.__frames = []; window.__commits = 0; window.__rec = true; });
      const m0 = await metrics(cdp); const t0 = Date.now();
      const dist = geo.h + 800;
      for (let y = 0; y < dist; y += 140) { await page.mouse.wheel(0, 140); await sleep(28); }
      await sleep(250);
      const wall = (Date.now() - t0) / 1000; const m1 = await metrics(cdp);
      const d = await page.evaluate(() => { window.__rec = false; return { f: window.__frames, c: window.__commits }; });
      const iv = []; for (let i = 1; i < d.f.length; i++) iv.push(d.f[i] - d.f[i - 1]);
      const ms = (k) => (m1[k] - m0[k]) * 1000;
      (acc[id] ||= []).push({ slow: iv.filter((x) => x > 33.4).length, frames: d.f.length, fps: d.f.length / wall, busy: (ms("TaskDuration") / (wall * 1000)) * 100, script: ms("ScriptDuration"), layout: ms("LayoutDuration"), style: ms("RecalcStyleDuration"), commits: d.c, px: dist });
    }
    await ctx.close();
  }
  await browser.close();
  const res = { base: BASE, view: VIEW, rate: RATE, runs: RUNS, css: !!CSS, scenes: {} };
  let tot = { slow: 0, style: 0, script: 0, layout: 0, commits: 0 };
  for (const [id, arr] of Object.entries(acc)) {
    const o = {}; for (const k of Object.keys(arr[0])) o[k] = r1(med(arr.map((x) => x[k])));
    res.scenes[id] = o; for (const k of Object.keys(tot)) tot[k] += o[k];
  }
  res.total = Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, r1(v)]));
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 2));
  console.log(`scene           slow  fps   busy%  script  layout  style  commits`);
  for (const [id, o] of Object.entries(res.scenes)) console.log(id.padEnd(15), String(o.slow).padStart(4), String(o.fps).padStart(5), String(o.busy).padStart(6), String(o.script).padStart(7), String(o.layout).padStart(7), String(o.style).padStart(6), String(o.commits).padStart(7));
  console.log("TOTAL".padEnd(15), String(res.total.slow).padStart(4), "      ", "      ", String(res.total.script).padStart(7), String(res.total.layout).padStart(7), String(res.total.style).padStart(6), String(res.total.commits).padStart(7));
})();
