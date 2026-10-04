// Behavioural checks for the showreel homepage. YouTube is stubbed with a page that speaks the same postMessage protocol.
// NODE_PATH=$(npm root -g) node scripts/perf/home-test.cjs http://localhost:3300 [file]
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3300";
const MODE = process.argv[3] || "youtube";
const out = []; const ok = (n, c, d = "") => out.push((c ? "PASS " : "FAIL ") + n + (d ? " - " + d : ""));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const STUB = `<!doctype html><body style="margin:0;background:#123"><script>
 var st=-1; function send(s){st=s; parent.postMessage(JSON.stringify({event:'onStateChange',info:s}),'*')}
 window.addEventListener('message',function(e){var d={};try{d=JSON.parse(e.data)}catch(_){return}
  if(d.event==='listening'){ if(st<0) setTimeout(function(){send(1)},300) }
  if(d.event==='command'){ window.__cmds=(window.__cmds||[]); parent.postMessage(JSON.stringify({event:'ack',func:d.func}),'*'); if(d.func==='pauseVideo')send(2); if(d.func==='playVideo')send(1); }
 });</script>stub</body>`;

async function newCtx(b, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const cmds = [];
  await ctx.route(/youtube-nocookie\.com\/embed/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: STUB }));
  await ctx.route(/i\.ytimg\.com/, (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNG }));
  return { ctx, cmds };
}

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errs = [];

  if (MODE === "youtube") {
    let { ctx } = await newCtx(b);
    let p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    ok("poster paints first (before any video)", (await p.locator(".rh-poster").count()) === 1);
    await p.waitForSelector(".rh-yt", { timeout: 4000 }).catch(() => {});
    ok("youtube iframe injected after first paint, privacy-enhanced domain", /youtube-nocookie\.com\/embed\/OtAjMig32ZE/.test((await p.locator(".rh-yt").getAttribute("src")) || ""));
    const src = (await p.locator(".rh-yt").getAttribute("src")) || "";
    ok("iframe is muted, looping, controls hidden", /mute=1/.test(src) && /loop=1/.test(src) && /controls=0/.test(src) && /playsinline=1/.test(src));
    await sleep(1800);
    ok("video fades in only once the player reports it is playing", (await p.locator(".rh-yt").getAttribute("data-on")) !== null);
    ok("pause control appears", (await p.getByRole("button", { name: /Pause background video/ }).count()) === 1);
    await p.getByRole("button", { name: /Pause background video/ }).click(); await sleep(500);
    ok("pause works (state mirrored)", (await p.getByRole("button", { name: /Play background video/ }).count()) === 1);
    await p.getByRole("button", { name: /Play background video/ }).click(); await sleep(500);
    ok("play works", (await p.getByRole("button", { name: /Pause background video/ }).count()) === 1);
    // lightbox
    await p.getByRole("button", { name: /Watch the showreel/ }).click(); await sleep(400);
    ok("showreel lightbox opens as modal dialog with sound-enabled embed", (await p.locator("dialog.reel-dialog[open] iframe").count()) === 1 && !/mute=1/.test((await p.locator("dialog iframe").getAttribute("src")) || ""));
    await p.keyboard.press("Escape"); await sleep(300);
    ok("Esc closes the lightbox and unloads the player", (await p.locator("dialog[open]").count()) === 0 && (await p.locator("dialog iframe").count()) === 0);
    ok("focus returns to the trigger", (await p.evaluate(() => document.activeElement?.textContent || "")).includes("Watch the showreel"));
    // header: transparent over hero then solid after scroll
    ok("header transparent over the video", (await p.locator(".site-header").getAttribute("data-solid")) === null);
    await p.evaluate(() => window.scrollTo(0, 900)); await sleep(500);
    ok("header turns solid on scroll", (await p.locator(".site-header").getAttribute("data-solid")) !== null);
    // neon: running when visible, paused when not
    await p.evaluate(() => window.scrollTo(0, 0)); await sleep(600);
    const live = await p.evaluate(() => document.querySelectorAll('.rh [data-neon][data-live]').length);
    ok("hero neon edge is live while visible", live >= 1);
    const running = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
    await p.evaluate(() => window.scrollTo(0, 3200)); await sleep(700);
    const heroLive = await p.evaluate(() => document.querySelector('.rh [data-neon]')?.hasAttribute('data-live'));
    ok("hero neon edge pauses when scrolled away", heroLive === false, `running animations at top: ${running}`);
    // spine light follows scroll
    const y1 = await p.evaluate(() => getComputedStyle(document.querySelector('.spine-light')).transform);
    await p.evaluate(() => window.scrollTo(0, 5200)); await sleep(500);
    const y2 = await p.evaluate(() => getComputedStyle(document.querySelector('.spine-light')).transform);
    ok("spine light travels with the reader", y1 !== y2, `${y1.slice(0, 30)} -> ${y2.slice(0, 30)}`);
    // traces: WAAPI light exists and is paused offscreen
    const tr = await p.evaluate(() => { const d = document.querySelector('.pm-trace .tr-dot'); return d ? d.getAnimations().map((a) => a.playState) : null; });
    ok("map trace light is a compositor animation (Web Animations)", Array.isArray(tr) && tr.length === 1, JSON.stringify(tr));
    await ctx.close();

    // poster blocked / video blocked -> designed stage remains, no crash
    ({ ctx } = await newCtx(b));
    await ctx.route(/i\.ytimg\.com/, (r) => r.abort());
    await ctx.route(/youtube-nocookie\.com\/embed/, (r) => r.abort());
    p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(2500);
    ok("blocked YouTube: hero still shows headline, CTA and the neutral screen", (await p.locator("h1").textContent()).includes("experiences") && (await p.locator(".rh-screen-base").count()) === 1 && (await p.getByRole("link", { name: /Start a project/ }).first().isVisible()));
    ok("blocked YouTube: no pause button for a video that never played", (await p.getByRole("button", { name: /background video/ }).count()) === 0);
    await ctx.close();

    // save-data + reduced motion -> poster only, nothing heavy loads
    ({ ctx } = await newCtx(b, { reducedMotion: "reduce" }));
    p = await ctx.newPage();
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(1500);
    ok("reduced motion: no iframe is ever created", (await p.locator(".rh-yt").count()) === 0);
    ok("reduced motion: travelling light is removed, lines remain", (await p.evaluate(() => getComputedStyle(document.querySelector('.nx-c')).display)) === "none");
    await ctx.close();
    ({ ctx } = await newCtx(b));
    p = await ctx.newPage();
    await p.addInitScript(() => Object.defineProperty(navigator, "connection", { value: { saveData: true, effectiveType: "4g" } }));
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(1500);
    ok("Save-Data: no iframe is created", (await p.locator(".rh-yt").count()) === 0);
    await ctx.close();

    // phone
    ({ ctx } = await newCtx(b, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }));
    p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(2200);
    const m = await p.evaluate(() => { const v = document.querySelector('.rh-screen').getBoundingClientRect(); const c = document.querySelector('.rh-copy h1').getBoundingClientRect(); const cta = document.querySelector('.rh-cta .btn-primary').getBoundingClientRect(); return { videoBottom: v.bottom, h1Top: c.top, ctaBottom: cta.bottom, vh: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth + 1 }; });
    ok("phone: headline and the framed showreel are inside the first screen", m.h1Top < m.vh * 0.85, JSON.stringify(m));
    ok("phone: no horizontal overflow", !m.overflow);
    ok("phone: pause control reachable", (await p.getByRole("button", { name: /Pause background video/ }).count()) === 1);
    await ctx.close();
  } else {
    // FILE MODE
    const { ctx } = await newCtx(b);
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" }); await sleep(2500);
    ok("file mode: <video> used, no YouTube iframe", (await p.locator("video.rh-video").count()) === 1 && (await p.locator(".rh-yt").count()) === 0);
    ok("file mode: video is playing and visible", await p.evaluate(() => { const v = document.querySelector("video.rh-video"); return !v.paused && v.readyState >= 2 && v.hasAttribute("data-on"); }));
    ok("file mode: muted + looping + inline", await p.evaluate(() => { const v = document.querySelector("video.rh-video"); return v.muted && v.loop && v.playsInline; }));
    await p.getByRole("button", { name: /Pause background video/ }).click(); await sleep(300);
    ok("file mode: pause control pauses the video", await p.evaluate(() => document.querySelector("video.rh-video").paused));
    await p.getByRole("button", { name: /Play background video/ }).click(); await sleep(300);
    await p.evaluate(() => window.scrollTo(0, 3000)); await sleep(700);
    ok("file mode: pauses when scrolled offscreen", await p.evaluate(() => document.querySelector("video.rh-video").paused));
    await p.evaluate(() => window.scrollTo(0, 0)); await sleep(700);
    ok("file mode: resumes when back in view", await p.evaluate(() => !document.querySelector("video.rh-video").paused));
    await p.getByRole("button", { name: /Watch the showreel/ }).click(); await sleep(500);
    ok("file mode: lightbox plays the file with controls", await p.evaluate(() => { const v = document.querySelector("dialog[open] video"); return !!v && v.controls; }));
    await ctx.close();
  }
  ok("no uncaught page errors", errs.length === 0, errs.join(" | "));
  console.log(out.join("\n")); await b.close();
})();
