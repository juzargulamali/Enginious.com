/*
 * Hero-only performance + screenshots. Same conditions before and after a hero change.
 *   NODE_PATH=$(npm root -g) node scripts/perf/hero-measure.cjs --base http://localhost:3300 --label before --out docs/design/atrium/perf-before.json --shots docs/design/atrium/before
 * YouTube and its thumbnails are stubbed (the sandbox cannot reach them): the stub player speaks the real postMessage protocol, and the
 * thumbnail is a NEUTRAL stand-in image (not Enginious footage). Headless Chromium renders in software, so read results as relative.
 * Scenarios per viewport and CPU rate: idle 5 s | pointer sweep 4 s (desktop only) | scroll through the hero in steps.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const sharp = require("sharp");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://localhost:3300"), LABEL = arg("label", "run"), OUT = arg("out", null), SHOTS = arg("shots", null);
const CSS = arg("css", null) ? fs.readFileSync(arg("css"), "utf8") : null, ONLY = arg("only", null);
const RUNS = +arg("runs", 3), RATES = arg("rates", "1,4").split(",").map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

const STUB = `<!doctype html><meta name="color-scheme" content="dark"><body style="margin:0;background:transparent"><script>
 var st=-1; function send(s){st=s; parent.postMessage(JSON.stringify({event:'onStateChange',info:s}),'*')}
 window.addEventListener('message',function(e){var d={};try{d=JSON.parse(e.data)}catch(_){return}
  if(d.event==='listening'){ if(st<0) setTimeout(function(){send(1)},300) }
  if(d.event==='command'){ if(d.func==='pauseVideo')send(2); if(d.func==='playVideo')send(1); }
 });</script></body>`;

async function standIn() {
  // neutral stand-in thumbnail: dark teal gradient with a plain label. NOT project footage.
  const svg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a2a36"/><stop offset="1" stop-color="#04121b"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><text x="640" y="372" fill="#4fb6c0" font-family="Arial" font-size="26" text-anchor="middle" letter-spacing="6">SHOWREEL POSTER STAND-IN</text></svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

async function ctxFor(b, view, rm) {
  const mobile = view === "mobile";
  const ctx = await b.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: view === "1280" ? 1280 : 1440, height: view === "1280" ? 800 : 900 }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile, reducedMotion: rm ? "reduce" : "no-preference" });
  const img = await standIn();
  await ctx.route(/youtube-nocookie\.com\/embed/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: STUB }));
  await ctx.route(/i\.ytimg\.com/, (r) => r.fulfill({ status: 200, contentType: "image/jpeg", body: img }));
  return ctx;
}
const INIT = () => {
  window.__frames = []; window.__long = []; window.__rec = false;
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: "longtask", buffered: true });
  const loop = (t) => { if (window.__rec) window.__frames.push(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
};
async function scenario(b, view, rate, name) {
  const ctx = await ctxFor(b, view, false);
  const p = await ctx.newPage(); await p.addInitScript(INIT);
  const cdp = await ctx.newCDPSession(p); await cdp.send("Performance.enable");
  await p.goto(BASE + "/", { waitUntil: "load" }); if (CSS) await p.addStyleTag({ content: CSS }); await sleep(3000);       // let the hero settle (video "playing")
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  const m0 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
  await p.evaluate(() => { window.__frames = []; window.__long = []; window.__rec = true; });
  const t0 = Date.now();
  if (name === "idle") await sleep(5000);
  if (name === "pointer") { for (let i = 0; i < 80; i++) { await p.mouse.move(100 + (i * 17) % 1200, 150 + Math.sin(i / 6) * 300 + 300); await sleep(50); } }
  if (name === "scroll") { for (let y = 0; y <= 900; y += 30) { await p.evaluate((yy) => window.scrollTo(0, yy), y); await sleep(33); } await sleep(300); }
  const wall = (Date.now() - t0) / 1000;
  const f = await p.evaluate(() => { window.__rec = false; return { frames: window.__frames, long: window.__long }; });
  const m1 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((x) => [x.name, x.value]));
  const d = (k) => (m1[k] - m0[k]) * 1000;
  const iv = f.frames.slice(1).map((t, i) => t - f.frames[i]);
  const res = { fps: r1(f.frames.length / wall), over33: iv.filter((x) => x > 33).length, worst: r1(Math.max(0, ...iv)), long: f.long.length, cpuBusyPct: r1(((d("TaskDuration")) / (wall * 1000)) * 100), style: r1(d("RecalcStyleDuration")), layout: r1(d("LayoutDuration")), script: r1(d("ScriptDuration")) };
  const layers = await p.evaluate(() => document.querySelectorAll("*").length);
  res.domNodes = layers;
  await ctx.close(); return res;
}
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
  const out = { label: LABEL, base: BASE, at: new Date().toISOString(), note: "software renderer; relative comparison only", results: {} };
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    for (const [view, rm] of [["1440", false], ["1280", false], ["mobile", false], ["1440", true], ["mobile", true]]) {
      const ctx = await ctxFor(b, view, rm); const p = await ctx.newPage();
      await p.goto(BASE + "/", { waitUntil: "load" }); await sleep(3200);
      const tag = `${view}${rm ? "-reduced" : ""}`;
      await p.screenshot({ path: `${SHOTS}/hero-${tag}.png` });
      if (!rm && view === "1440") { await p.evaluate(() => window.scrollTo(0, 420)); await sleep(500); await p.screenshot({ path: `${SHOTS}/hero-1440-scrolled.png` }); }
      await ctx.close();
    }
  }
  if (process.argv.includes("--shots-only")) { await b.close(); return; }
  for (const view of ["1440", "mobile"]) for (const rate of RATES) for (const name of (view === "mobile" ? ["idle", "scroll"] : ["idle", "pointer", "scroll"])) {
    if (ONLY && !ONLY.split(",").includes(`${view} x${rate} ${name}`)) continue;
    const runs = []; for (let i = 0; i < RUNS; i++) runs.push(await scenario(b, view, rate, name));
    const keys = Object.keys(runs[0]); const m = {}; for (const k of keys) m[k] = r1(med(runs.map((r) => r[k])));
    out.results[`${view} x${rate} ${name}`] = m; console.log(`${view} x${rate} ${name}`, JSON.stringify(m));
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  await b.close();
})();
