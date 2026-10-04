/*
 * Section-by-section screenshots of the homepage (viewport shots after scrolling each scene into its natural reading position).
 *   NODE_PATH=$(npm root -g) node scripts/perf/atrium-shots.cjs --base http://localhost:3300 --out docs/design/atrium/before
 * YouTube and its thumbnails are stubbed (the sandbox cannot reach them); the thumbnail is a NEUTRAL stand-in image, never project footage.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const sharp = require("sharp");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("base", "http://localhost:3300"), OUT = arg("out", "/tmp/claude-0/atrium/shots"), ONLY = arg("only", null);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STUB = `<!doctype html><meta name="color-scheme" content="dark"><body style="margin:0;background:transparent"></body>`;
const SCENES = [
  ["00-hero", null, 0],
  ["01-capabilities", "#capabilities .cs", 0.12],
  ["02-engineering", "#engineering .tw", 0.1],
  ["03-technology", "#technology .sr-stage", 0.08],
  ["04-projects-top", "#projects .proj-top", 0.2],
  ["05-projects-film", "#projects .film-full", 0.12],
  ["06-projects-reel", "#projects .reel", 0.5],
  ["07-clients", "#clients .cn", 0.2],
  ["08-people", "#people .tg-stage", 0.12],
  ["09-global", "#global .pm-frame", 0.15],
  ["10-final", ".final", 0.02],
];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
  const img = await sharp({ create: { width: 1280, height: 720, channels: 3, background: "#0a2a36" } }).composite([{ input: Buffer.from(`<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg"><text x="640" y="372" fill="#4fb6c0" font-family="Arial" font-size="26" text-anchor="middle" letter-spacing="6">POSTER STAND-IN</text></svg>`) }]).jpeg().toBuffer();
  for (const [view, vp, dpr] of [["desktop", { width: 1440, height: 900 }, 1], ["mobile", { width: 390, height: 844 }, 2]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: dpr, hasTouch: view === "mobile", isMobile: view === "mobile" });
    await ctx.route(/youtube-nocookie\.com\/embed/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: STUB }));
    await ctx.route(/i\.ytimg\.com/, (r) => r.fulfill({ status: 200, contentType: "image/jpeg", body: img }));
    const p = await ctx.newPage();
    await p.goto(BASE + "/", { waitUntil: "load" }); await sleep(2500);
    for (const [name, sel, at] of SCENES) {
      if (ONLY && !ONLY.split(",").some((o) => name.includes(o))) continue;
      if (sel) {
        const y = await p.evaluate(([s, a]) => { const el = document.querySelector(s); if (!el) return -1; const r = el.getBoundingClientRect(); return Math.round(window.scrollY + r.top - innerHeight * a); }, [sel, at]);
        if (y < 0) { console.log("missing", name); continue; }
        // scroll in steps so scroll-linked scenes and lazy bits wake up the way they do for a reader
        const cur = await p.evaluate(() => window.scrollY); const steps = 8;
        for (let i = 1; i <= steps; i++) { await p.evaluate((yy) => window.scrollTo(0, yy), Math.round(cur + ((y - cur) * i) / steps)); await sleep(60); }
      } else await p.evaluate(() => window.scrollTo(0, 0));
      if (sel) { // sections below the fold change height as they render: measure again and settle on the target
        for (let k = 0; k < 2; k++) { await sleep(500); const y2 = await p.evaluate(([s2, a2]) => { const el = document.querySelector(s2); const r = el.getBoundingClientRect(); return Math.round(window.scrollY + r.top - innerHeight * a2); }, [sel, at]); await p.evaluate((yy) => window.scrollTo(0, yy), y2); }
      }
      await sleep(1500);
      await p.screenshot({ path: `${OUT}/${view}-${name}.png` });
    }
    await ctx.close();
  }
  await b.close(); console.log("done", OUT);
})();
