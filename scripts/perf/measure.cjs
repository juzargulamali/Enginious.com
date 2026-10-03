/*
 * Performance harness. Usage (needs playwright + a Chromium binary):
 *   NODE_PATH=$(npm root -g) node scripts/perf/measure.cjs --base http://localhost:3300 --label before \
 *     --rates 1,4 --runs 3 --out docs/perf/before.json [--only home,gallery,showroom,routes] [--css file.css]
 * Reports, per scenario: frame pacing (rAF intervals), long tasks, interaction latency (Event Timing),
 * React commits (via the devtools hook), and CPU time split from CDP Performance.getMetrics.
 * NOTE: headless Chromium here renders in software (no GPU), so absolute numbers are pessimistic for paint-heavy pages.
 * Treat results as relative before/after evidence under identical conditions, not as real-device numbers.
 */
const { chromium } = require("playwright");
const fs = require("fs");

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://localhost:3300");
const LABEL = arg("label", "run");
const RATES = arg("rates", "1,4").split(",").map(Number);
const RUNS = +arg("runs", 3);
const OUT = arg("out", null);
const ONLY = arg("only", "home,gallery,showroom,routes").split(",");
const CSS = arg("css", null) ? fs.readFileSync(arg("css"), "utf8") : null;
const VIEW = arg("view", "desktop");
const INITJS = arg("init", null) ? fs.readFileSync(arg("init"), "utf8") : null;
const DPR = +arg("dpr", VIEW === "mobile" ? 2 : 1);
const W = VIEW === "mobile" ? 390 : 1440, H = VIEW === "mobile" ? 844 : 900;

const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

const INIT = () => {
  window.__commits = 0; window.__frames = []; window.__long = []; window.__ev = []; window.__rec = false;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true, renderers: new Map(), isDisabled: false,
    inject(r) { this.renderers.set(1, r); return 1; },
    onCommitFiberRoot() { window.__commits++; }, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {},
  };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: "longtask", buffered: true });
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__ev.push(e.duration))).observe({ type: "event", durationThreshold: 16, buffered: false }); } catch {}
  const loop = (t) => { if (window.__rec) window.__frames.push(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};

async function cdpMetrics(cdp) {
  const { metrics } = await cdp.send("Performance.getMetrics");
  const o = {}; metrics.forEach((m) => (o[m.name] = m.value)); return o;
}

async function measure(page, cdp, fn) {
  await page.evaluate(() => { window.__frames = []; window.__long = []; window.__ev = []; window.__commits = 0; window.__rec = true; });
  const m0 = await cdpMetrics(cdp);
  const t0 = Date.now();
  await fn();
  const wall = (Date.now() - t0) / 1000;
  const m1 = await cdpMetrics(cdp);
  const d = await page.evaluate(() => { window.__rec = false; return { f: window.__frames, l: window.__long, e: window.__ev, c: window.__commits }; });
  const iv = []; for (let i = 1; i < d.f.length; i++) iv.push(d.f[i] - d.f[i - 1]);
  const ms = (k) => ((m1[k] - m0[k]) * 1000);
  return {
    fps: r1(d.f.length / wall), frameMedianMs: r1(med(iv)), frameP95Ms: r1(pct(iv, 0.95)), frameWorstMs: r1(Math.max(0, ...iv)),
    framesOver33ms: iv.filter((x) => x > 33.4).length, framesOver50ms: iv.filter((x) => x > 50).length, frames: d.f.length,
    longTasks: d.l.length, longTaskMs: r1(d.l.reduce((a, b) => a + b, 0)),
    eventMaxMs: r1(Math.max(0, ...d.e)), eventP95Ms: r1(pct(d.e, 0.95)), events: d.e.length,
    reactCommits: d.c,
    mainThreadBusyPct: r1((ms("TaskDuration") / (wall * 1000)) * 100), scriptMs: r1(ms("ScriptDuration")), layoutMs: r1(ms("LayoutDuration")), styleMs: r1(ms("RecalcStyleDuration")),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SCENARIOS = {
  async home(page, cdp) {
    const out = {};
    await page.goto(BASE + "/", { waitUntil: "networkidle" }); await sleep(800);
    out.homeIdle5s = await measure(page, cdp, () => sleep(5000));
    out.homePointerSweep4s = await measure(page, cdp, async () => {
      for (let i = 0; i < 125; i++) { await page.mouse.move(W * (0.5 + 0.35 * Math.sin(i / 8)), H * (0.4 + 0.25 * Math.cos(i / 6))); await sleep(16); }
    });
    out.homeScrollWholePage = await measure(page, cdp, async () => {
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += 140) { await page.mouse.wheel(0, 140); await sleep(28); }
      await sleep(300);
    });
    return out;
  },
  async gallery(page, cdp) {
    const out = {};
    await page.goto(BASE + "/company/team", { waitUntil: "networkidle" }); await sleep(800);
    out.galleryNext8 = await measure(page, cdp, async () => {
      for (let i = 0; i < 8; i++) { await page.getByRole("button", { name: "Next person" }).click(); await sleep(450); }
    });
    out.galleryFilterSwitch = await measure(page, cdp, async () => {
      for (const n of ["Engineering", "Creative", "Software", "All people"]) { await page.getByRole("button", { name: n, exact: true }).click(); await sleep(450); }
    });
    out.galleryDragSwipe = await measure(page, cdp, async () => {
      const box = await page.locator(".gallery").boundingBox();
      for (let k = 0; k < 4; k++) {
        await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5); await page.mouse.down();
        for (let i = 1; i <= 12; i++) { await page.mouse.move(box.x + box.width * (0.6 - i * 0.03), box.y + box.height * 0.5); await sleep(16); }
        await page.mouse.up(); await sleep(500);
      }
    });
    out.galleryScroll = await measure(page, cdp, async () => {
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += 140) { await page.mouse.wheel(0, 140); await sleep(28); }
    });
    return out;
  },
  async showroom(page, cdp) {
    const out = {};
    await page.goto(BASE + "/technologies", { waitUntil: "networkidle" }); await sleep(800);
    out.showroomSelectExhibits = await measure(page, cdp, async () => {
      const n = await page.locator(".exhibit").count();
      for (let i = 0; i < n; i++) { await page.locator(".exhibit").nth(i).click(); await sleep(350); }
    });
    out.showroomCategorySwitch = await measure(page, cdp, async () => {
      for (const n of ["Interactive", "Immersive", "AI", "Robotics", "Kinetic"]) { await page.getByRole("button", { name: n, exact: true }).first().click(); await sleep(450); }
    });
    out.showroomPointerSweep3s = await measure(page, cdp, async () => {
      const box = await page.locator(".stage").boundingBox();
      for (let i = 0; i < 90; i++) { await page.mouse.move(box.x + box.width * (0.5 + 0.4 * Math.sin(i / 7)), box.y + box.height * (0.5 + 0.3 * Math.cos(i / 5))); await sleep(16); }
    });
    out.showroomBrowseFilter = await measure(page, cdp, async () => {
      await page.locator("#browse").scrollIntoViewIfNeeded();
      for (const n of ["Kinetic", "Interactive", "All"]) { await page.locator("#browse").getByRole("button", { name: n, exact: true }).click(); await sleep(400); }
    });
    return out;
  },
  async routes(page, cdp) {
    const out = {};
    await page.goto(BASE + "/", { waitUntil: "networkidle" }); await sleep(1500); // allow link prefetch
    const hops = [["Work", "/work"], ["Technologies", "/technologies"], ["Company", "/company"], ["Insights", "/insights"]];
    const times = [];
    out.routeTransitions = await measure(page, cdp, async () => {
      for (const [label, path] of hops) {
        const t0 = Date.now();
        await page.locator(".nav-links").getByRole("link", { name: label, exact: true }).click();
        await page.waitForURL("**" + path); await page.waitForFunction(() => document.querySelector("h1") && document.readyState === "complete");
        times.push(Date.now() - t0); await sleep(500);
      }
    });
    out.routeTransitions.hopMs = times; out.routeTransitions.hopMedianMs = med(times);
    return out;
  },
};

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const results = { label: LABEL, base: BASE, view: VIEW, viewport: [W, H], css: CSS ? "injected" : null, init: INITJS ? "injected" : null, dpr: DPR, runs: RUNS, rates: {} };
  for (const rate of RATES) {
    const per = {};
    for (let run = 0; run < RUNS; run++) {
      for (const name of ONLY) {
        const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, hasTouch: VIEW === "mobile", isMobile: VIEW === "mobile" });
        await ctx.addInitScript(INIT);
        if (INITJS) await ctx.addInitScript(INITJS);
        const page = await ctx.newPage();
        const cdp = await ctx.newCDPSession(page);
        await cdp.send("Performance.enable");
        await cdp.send("Emulation.setCPUThrottlingRate", { rate });
        if (CSS) await ctx.addInitScript((css) => document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }), CSS);
        try {
          const res = await SCENARIOS[name](page, cdp);
          for (const [k, v] of Object.entries(res)) (per[k] ||= []).push(v);
        } catch (e) { console.error("scenario failed", name, e.message.split("\n")[0]); }
        await ctx.close();
      }
    }
    // reduce runs -> median per numeric field
    results.rates[rate] = {};
    for (const [k, arr] of Object.entries(per)) {
      const o = {};
      for (const f of Object.keys(arr[0])) if (typeof arr[0][f] === "number") o[f] = r1(med(arr.map((x) => x[f]).filter((x) => x != null)));
      if (arr[0].hopMs) o.hopMs = arr.map((x) => x.hopMs);
      results.rates[rate][k] = o;
    }
  }
  await browser.close();
  const json = JSON.stringify(results, null, 2);
  if (OUT) fs.writeFileSync(OUT, json);
  // compact table
  for (const [rate, sc] of Object.entries(results.rates)) {
    console.log(`\n=== ${LABEL} | ${VIEW} | CPU x${rate} (median of ${RUNS}) ===`);
    for (const [k, v] of Object.entries(sc))
      console.log(k.padEnd(26), `fps ${String(v.fps).padStart(5)} | p95 ${String(v.frameP95Ms).padStart(6)}ms | worst ${String(v.frameWorstMs).padStart(6)}ms | >33ms ${String(v.framesOver33ms).padStart(3)} | long ${String(v.longTasks).padStart(2)} (${v.longTaskMs}ms) | evtMax ${v.eventMaxMs}ms | commits ${v.reactCommits} | busy ${v.mainThreadBusyPct}% (js ${v.scriptMs} / layout ${v.layoutMs} / style ${v.styleMs})` + (v.hopMedianMs ? ` | hopMedian ${v.hopMedianMs}ms` : ""));
  }
})();
