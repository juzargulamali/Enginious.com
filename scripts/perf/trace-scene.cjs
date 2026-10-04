// Chrome trace of one scene's scroll; prints the heaviest main-thread event names. NODE_PATH=$(npm root -g) node scripts/perf/trace-scene.cjs engineering [--css f.css]
const { chromium } = require("playwright");
const fs = require("fs");
const id = process.argv[2] || "engineering";
const ci = process.argv.indexOf("--css"); const CSS = ci > -1 ? fs.readFileSync(process.argv[ci + 1], "utf8") : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  if (CSS) await ctx.addInitScript((css) => document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }), CSS);
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page);
  await page.goto("http://localhost:3300/", { waitUntil: "networkidle" }); await sleep(1500);
  const geo = await page.evaluate((id) => { const el = id === "hero" ? document.querySelector(".rh") : document.getElementById(id); const r = el.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height }; }, id);
  await page.evaluate((y) => window.scrollTo(0, y), geo.top - 700); await sleep(900);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await b.startTracing(page, { categories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "cc", "gpu", "viz", "blink"] });
  for (let y = 0; y < geo.h + 800; y += 140) { await page.mouse.wheel(0, 140); await sleep(28); }
  await sleep(300);
  const buf = await b.stopTracing();
  const ev = JSON.parse(buf.toString()).traceEvents;
  // find renderer main thread of the page: thread named CrRendererMain with most events
  const names = {}; ev.filter((e) => e.ph === "M" && e.name === "thread_name").forEach((e) => (names[e.pid + ":" + e.tid] = e.args.name));
  const byThread = {}; ev.filter((e) => e.ph === "X" && e.dur).forEach((e) => { const k = e.pid + ":" + e.tid; byThread[k] = (byThread[k] || 0) + e.dur; });
  const rep = (label, pred) => {
    const sum = {}; ev.filter((e) => e.ph === "X" && e.dur && pred(names[e.pid + ":" + e.tid] || "")).forEach((e) => { sum[e.name] = (sum[e.name] || 0) + e.dur; });
    console.log("\n== " + label); Object.entries(sum).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([n, d]) => console.log(String((d / 1000).toFixed(1)).padStart(8) + " ms  " + n));
  };
  if (process.argv.includes("--quiet")) {
    const get = (thr, nm) => ev.filter((e) => e.ph === "X" && e.dur && e.name === nm && thr(names[e.pid + ":" + e.tid] || "")).reduce((a, e) => a + e.dur, 0) / 1000;
    const m = (n) => get((x) => x === "CrRendererMain", n).toFixed(0).padStart(5);
    const lt = ev.filter((e) => e.name === "PaintArtifactCompositor::Update" && e.ph === "X").length;
    console.log(`main ${m("RunTask")} | layerize ${m("PaintArtifactCompositor::Update")} | paint ${m("LocalFrameView::RunPaintLifecyclePhase")} | style+layout ${m("LocalFrameView::UpdateStyleAndLayout")} | sw-draw ${get((x) => /Compositor/.test(x), "SoftwareRenderer::DoDrawQuad").toFixed(0)}`);
    await b.close(); return;
  }
  rep("main thread (CrRendererMain)", (n) => n === "CrRendererMain");
  rep("compositor + raster threads", (n) => /Compositor|Raster|CompositorTile/.test(n));
  await b.close();
})();
