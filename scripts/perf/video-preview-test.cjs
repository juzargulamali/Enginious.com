/*
 * Card previews and detail-page players. REAL vs STUB, stated plainly: the sandbox cannot reach YouTube, so the YouTube IFrame API and embeds are
 * STUBBED by a fake player (same API surface: Player, onReady/onStateChange, playVideo, seekTo, getCurrentTime, mute, destroy). The direct-video path
 * uses a REAL <video> element playing a local clip served at https://videos.test/clip.webm. What this proves: our player management, single-player
 * rule, looping logic, cleanup and fallbacks. It does NOT prove how real YouTube behaves (restart pauses, buffering, autoplay policy); see the report.
 * Needs the temporary content from scripts/perf/video-test-patch.py.
 * NODE_PATH=$(npm root -g) node scripts/perf/video-preview-test.cjs http://localhost:3300 /path/to/clip.webm [outdir]
 */
const { chromium } = require("playwright");
const fs = require("fs");
const BASE = process.argv[2] || "http://localhost:3300"; const CLIP = fs.readFileSync(process.argv[3]); const OUT = process.argv[4];
const out = []; const ok = (n, c, d = "") => out.push((c ? "PASS " : "FAIL ") + n + (d ? " - " + d : ""));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// A neutral labelled stand-in thumbnail (the sandbox cannot fetch real YouTube thumbnails). Never project footage.
const PNG = require("child_process").execFileSync("node", ["-e", `const s=require("sharp");s(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#244a58"/><stop offset="1" stop-color="#0b1f29"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><text x="640" y="380" font-size="54" font-family="sans-serif" text-anchor="middle" fill="#8fb4bd" letter-spacing="6">STAND-IN POSTER</text></svg>')).png().toBuffer().then(b=>process.stdout.write(b.toString("base64")))`], { cwd: __dirname + "/../..", env: process.env }).toString();
const PNGBUF = Buffer.from(PNG, "base64");
const YT_API = `(function(){
  window.__yt = { live: 0, max: 0, created: 0, seeks: [], muted: 0, unmuted: 0, destroyed: 0 };
  window.YT = { Player: function(el, o){
    var self = this, state = -1, t0 = 0, base = o.playerVars.start || 0, dead = false;
    window.__yt.created++; window.__yt.live++; window.__yt.max = Math.max(window.__yt.max, window.__yt.live);
    var f = document.createElement('iframe'); f.src = 'about:blank'; f.title = 'stub'; f.setAttribute('data-stub-yt', o.videoId); f.style.cssText = 'width:100%;height:100%;border:0'; el.replaceWith(f);
    self.mute = function(){ window.__yt.muted++; }; self.unMute = function(){ window.__yt.unmuted++; };
    self.seekTo = function(s){ base = s; t0 = performance.now(); window.__yt.seeks.push(s); };
    self.getCurrentTime = function(){ return base + (performance.now() - t0) / 1000; };
    self.getPlayerState = function(){ return state; };
    self.playVideo = function(){ if (o.videoId === 'STALL000000') return; setTimeout(function(){ if (dead) return; state = 1; t0 = performance.now(); o.events.onStateChange({ data: 1, target: self }); }, 250); };
    self.destroy = function(){ if (dead) return; dead = true; window.__yt.live--; window.__yt.destroyed++; f.remove(); };
    setTimeout(function(){ if (!dead) o.events.onReady({ target: self }); }, 150);
  } };
  setTimeout(function(){ window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady(); }, 50);
})();`;

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium", args: ["--autoplay-policy=no-user-gesture-required"] });
  const errs = [];
  const open = async (path, opts = {}, view = [1440, 900]) => {
    const ctx = await b.newContext({ viewport: { width: view[0], height: view[1] }, ...opts });
    await ctx.route(/youtube\.com\/iframe_api/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: YT_API }));
    await ctx.route(/youtube-nocookie\.com\/embed/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<body style=background:#123>stub player</body>" }));
    await ctx.route(/i\.ytimg\.com/, (r) => r.fulfill({ status: 200, contentType: "image/png", body: PNGBUF }));
    await ctx.route(/videos\.test\/clip\.webm/, (r) => { // honours Range requests like a real file host, so seeking works
      const m = /bytes=(\d+)-(\d*)/.exec(r.request().headers()["range"] || "");
      if (!m) return r.fulfill({ status: 200, headers: { "Accept-Ranges": "bytes", "Content-Length": String(CLIP.length) }, contentType: "video/webm", body: CLIP });
      const a = +m[1], z = m[2] ? Math.min(+m[2], CLIP.length - 1) : CLIP.length - 1;
      r.fulfill({ status: 206, headers: { "Accept-Ranges": "bytes", "Content-Range": `bytes ${a}-${z}/${CLIP.length}`, "Content-Length": String(z - a + 1) }, contentType: "video/webm", body: CLIP.subarray(a, z + 1) });
    });
    await ctx.route(/videos\.test\/bad\.mp4/, (r) => r.fulfill({ status: 404, body: "no" }));
    await ctx.route(/youtube\.com\/embed/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<body>stub</body>" }));
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(String(e)));
    await p.goto(BASE + path, { waitUntil: "load" }); await p.addStyleTag({ content: "html{scroll-behavior:auto !important}" }); await sleep(800);
    return { ctx, p };
  };
  const cards = (p) => p.evaluate(() => [...document.querySelectorAll("[data-vcard]")].map((c, i) => { const r = c.getBoundingClientRect(); const m = c.querySelector(".vc"); return { i, has: !!m, video: !!m?.dataset.video, x: r.x + r.width / 2, y: r.y + 120, title: c.querySelector("h3")?.textContent }; }));
  const mounted = (p) => p.evaluate(() => ({ layers: document.querySelectorAll(".vc-layer").length, yt: document.querySelectorAll("iframe[data-stub-yt]").length, files: document.querySelectorAll(".vc-file").length, states: [...document.querySelectorAll(".vc")].map((v) => v.dataset.state).filter((s) => s !== "idle") }));
  const scrollTo = (p, i) => p.evaluate((i) => { const c = document.querySelectorAll("[data-vcard]")[i]; const r = c.getBoundingClientRect(); window.scrollTo(0, scrollY + r.top - 200); }, i);

  // ===== Work listing (desktop, mouse)
  { const { ctx, p } = await open("/work");
    ok("no YouTube API, no player and no video element at page load", await p.evaluate(() => !window.YT && document.querySelectorAll("iframe, video").length === 0));
    const cs = await cards(p); const vids = cs.filter((c) => c.video);
    ok("cards with a video show a poster block; cards without any image keep the placeholder", vids.length >= 5 && cs.some((c) => !c.has));
    // single-player observer
    await p.evaluate(() => { window.__maxMounted = 0; new MutationObserver(() => { const n = document.querySelectorAll("iframe[data-stub-yt], .vc-file").length; window.__maxMounted = Math.max(window.__maxMounted, n); }).observe(document.body, { childList: true, subtree: true }); });
    // 1. hover a YouTube card
    await scrollTo(p, 0); await sleep(500);
    const c0 = (await cards(p))[0];
    await p.mouse.move(c0.x, c0.y, { steps: 5 }); await sleep(120);
    ok("a brief pass does not start anything (dwell)", (await mounted(p)).layers === 0);
    await sleep(700);
    const m1 = await mounted(p);
    ok("hover: exactly one YouTube preview player is created, muted", m1.yt === 1 && (await p.evaluate(() => window.__yt.muted)) >= 1 && (await p.evaluate(() => window.__yt.unmuted)) === 0, JSON.stringify(m1));
    ok("preview fades in only once playing", m1.states.includes("playing"));
    await sleep(4600);
    const seeks = await p.evaluate(() => window.__yt.seeks);
    ok("segment repeats while the card stays active (seeks back to the start time)", seeks.length >= 2 && seeks.slice(1).every((s) => s === 5), JSON.stringify(seeks));
    // 2. leave
    await p.mouse.move(c0.x, 20, { steps: 4 }); await sleep(400);
    const m2 = await mounted(p); ok("leaving the card removes the player", m2.layers === 0 && m2.yt === 0 && (await p.evaluate(() => window.__yt.live)) === 0, JSON.stringify(m2));
    // 3. switch YouTube -> file card (direct video, real element)
    await scrollTo(p, 1); await sleep(400); const c1 = (await cards(p))[1];
    await p.mouse.move(c1.x, c1.y, { steps: 5 }); await sleep(1500);
    const m3 = await mounted(p);
    ok("direct video: one real video element, muted, playing", m3.files === 1 && m3.yt === 0 && (await p.evaluate(() => { const v = document.querySelector(".vc-file"); return v.muted && !v.paused && v.currentTime >= 1.9; })), JSON.stringify(m3));
    const samples = []; for (let k = 0; k < 28; k++) { samples.push(await p.evaluate(() => document.querySelector(".vc-file")?.currentTime ?? -1)); await sleep(300); }
    const wrapped = samples.some((v, k) => k > 0 && v < samples[k - 1] - 1);
    ok("direct video repeats its segment (time wraps back to the start, never passes start+length)", wrapped && Math.max(...samples) < 6.7 && Math.min(...samples.filter((v) => v >= 0)) >= 1.9, JSON.stringify(samples.map((v) => +v.toFixed(1))));
    // 4. rapid switching across cards
    await p.evaluate(() => scrollTo(0, 0)); await sleep(300);
    const all = await cards(p);
    for (const c of all.filter((x) => x.video)) { await p.evaluate(([i]) => { const el = document.querySelectorAll("[data-vcard]")[i]; el.scrollIntoView({ block: "center" }); }, [c.i]); const q = (await cards(p))[c.i]; await p.mouse.move(q.x, q.y, { steps: 2 }); await sleep(330); }
    await sleep(800);
    const mx = await p.evaluate(() => ({ max: window.__maxMounted, ytMax: window.__yt.max, live: window.__yt.live }));
    ok("rapid switching: never more than one preview player at any moment", mx.max <= 1 && mx.ytMax <= 1, JSON.stringify(mx));
    ok("rapid switching: no accumulated YouTube players", mx.live <= 1, JSON.stringify(mx));
    await p.mouse.move(5, 5, { steps: 3 }); await sleep(500);
    ok("pointer away from every card: nothing left mounted", (await mounted(p)).layers === 0 && (await p.evaluate(() => window.__yt.live)) === 0);
    // 5. off-screen cleanup
    await scrollTo(p, 1); await sleep(400); const cc = (await cards(p))[1];
    await p.mouse.move(cc.x, cc.y, { steps: 3 }); await sleep(1500);
    const before = (await mounted(p)).layers;
    await p.evaluate(() => scrollBy(0, 2600)); await sleep(1200);
    ok("scrolling the active card off-screen removes its preview", before === 1 && (await mounted(p)).layers === 0, `before=${before}`);
    await p.mouse.move(5, 5); await p.evaluate(() => scrollTo(0, 0)); await sleep(400);
    // 6. keyboard
    const btnCount = await p.locator(".vc-btn").count(); ok("every video card has a labelled preview button", btnCount >= 5 && (await p.locator(".vc-btn").first().getAttribute("aria-label")).startsWith("Play preview of"));
    await p.evaluate(() => document.querySelectorAll(".vc-btn")[1].scrollIntoView({ block: "center" }));
    await p.locator(".vc-btn").nth(1).focus(); await sleep(900);
    ok("keyboard focus on a card starts its preview", (await mounted(p)).layers === 1);
    ok("the button then says Stop and Enter stops it", (await p.locator(".vc-btn").nth(1).getAttribute("aria-label")).startsWith("Stop preview") && (await (async () => { await p.keyboard.press("Enter"); await sleep(400); return (await mounted(p)).layers === 0; })()));
    await p.evaluate(() => document.activeElement && document.activeElement.blur());
    // 7. broken file, stalled YouTube
    await p.evaluate((i) => { document.querySelectorAll("[data-vcard]")[i].scrollIntoView({ block: "center" }); }, 3);
    const cb = (await cards(p))[3]; await p.mouse.move(cb.x, cb.y, { steps: 4 }); await sleep(2500);
    ok("broken video file: back to the poster, nothing left mounted", (await mounted(p)).layers === 0 && (await p.locator("[data-vcard]").nth(3).locator(".vc-btn").count()) === 1);
    await p.mouse.move(5, 5); await sleep(300);
    await p.evaluate((i) => { document.querySelectorAll("[data-vcard]")[i].scrollIntoView({ block: "center" }); }, 4);
    const cs4 = (await cards(p))[4]; await p.mouse.move(cs4.x, cs4.y, { steps: 4 }); await sleep(6500);
    ok("a YouTube player that never starts (blocked autoplay / stall) is removed and the poster stays", (await mounted(p)).layers === 0 && (await p.evaluate(() => window.__yt.live)) === 0);
    if (OUT) { await p.mouse.move(5, 5); await p.evaluate(() => scrollTo(0, 0)); await sleep(300); await p.screenshot({ path: `${OUT}/work-desktop.png` }); }
    ok("no horizontal overflow (desktop)", (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    await ctx.close(); }

  // ===== Work listing (phone, touch)
  { const { ctx, p } = await open("/work", { hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, [390, 844]);
    const cs = await cards(p);
    const op = await p.evaluate(() => getComputedStyle(document.querySelector(".vc-btn")).opacity);
    ok("touch: the preview button is always visible (not hover-only)", op === "1", op);
    const y0 = await p.evaluate(() => scrollY); await p.evaluate(() => scrollBy(0, 600)); await sleep(200);
    ok("touch: vertical scrolling is untouched by the preview markup", (await p.evaluate(() => scrollY)) > y0 + 500);
    await p.evaluate(() => document.querySelectorAll(".vc-btn")[1].scrollIntoView({ block: "center" }));
    await p.locator(".vc-btn").nth(1).tap(); await sleep(1500);
    const m = await mounted(p); ok("touch: tapping Preview plays it (muted), card link still separate", m.layers === 1 && (await p.evaluate(() => document.querySelector(".vc-file")?.muted !== false)), JSON.stringify(m));
    await p.locator(".vc-btn").nth(1).tap(); await sleep(500);
    ok("touch: tapping Stop removes it", (await mounted(p)).layers === 0);
    ok("touch: nothing starts by itself on touch/scroll", await (async () => { await p.evaluate(() => scrollBy(0, 900)); await sleep(900); return (await mounted(p)).layers === 0; })());
    ok("no horizontal overflow (390)", (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    if (OUT) { await p.evaluate(() => scrollTo(0, 0)); await sleep(300); await p.screenshot({ path: `${OUT}/work-mobile.png` }); }
    void cs; await ctx.close(); }

  // ===== reduced motion: no automatic preview, deliberate playback works
  { const { ctx, p } = await open("/work", { reducedMotion: "reduce" });
    await scrollTo(p, 1); await sleep(400); const c1 = (await cards(p))[1];
    await p.mouse.move(c1.x, c1.y, { steps: 4 }); await sleep(1500);
    ok("reduced motion: hovering starts nothing", (await mounted(p)).layers === 0);
    ok("reduced motion: the Preview button is visible", (await p.evaluate(() => getComputedStyle(document.querySelector(".vc-btn")).opacity)) === "1");
    await p.locator(".vc-btn").nth(1).click(); await sleep(1500);
    ok("reduced motion: pressing Preview plays it deliberately", (await mounted(p)).layers === 1);
    await ctx.close(); }

  // ===== Technologies listing
  { const { ctx, p } = await open("/technologies");
    const cs = await cards(p); const withMedia = cs.filter((c) => c.has);
    ok("technology cards show media only for technologies that have a video or image", withMedia.length === 2 && cs.length > 2, `${withMedia.length} of ${cs.length}`);
    await p.evaluate((i) => document.querySelectorAll("[data-vcard]")[i].scrollIntoView({ block: "center" }), withMedia[0].i);
    const q = (await cards(p))[withMedia[0].i]; await p.mouse.move(q.x, q.y, { steps: 5 }); await sleep(1500);
    ok("technologies: hover plays a single preview", (await mounted(p)).layers === 1);
    if (OUT) await p.screenshot({ path: `${OUT}/technologies-desktop.png` });
    await ctx.close(); }

  // ===== Detail pages: the full player is visible, poster + Play ready, no modal
  for (const [path, label] of [["/work/whx", "project"], ["/technologies/tri-helix", "technology"]]) {
    const { ctx, p } = await open(path);
    const vp = await p.evaluate(() => { const v = document.querySelector(".vp"); if (!v) return null; const r = v.getBoundingClientRect(); return { w: r.width, h: r.height, poster: !!v.querySelector(".vp-poster img, .vp-poster picture"), play: !!v.querySelector(".vp-play"), inView: r.top < innerHeight * 3 }; });
    ok(`${label} page: the player is already in the page with its poster and Play control`, vp && vp.w > 300 && vp.play && vp.poster, JSON.stringify(vp));
    ok(`${label} page: no "Watch video" button or dialog is needed`, (await p.locator("dialog[open], [role=dialog]").count()) === 0);
    await p.locator(".vp-play").scrollIntoViewIfNeeded(); if (OUT) await p.screenshot({ path: `${OUT}/${label}-detail-before-play.png` });
    await p.locator(".vp-play").click(); await sleep(600);
    const src = await p.locator(".vp iframe").getAttribute("src");
    ok(`${label} page: Play loads the full player with sound (no mute, no segment limits)`, !!src && /autoplay=1/.test(src) && !/mute=1|end=|start=/.test(src), src);
    await ctx.close(); }
  { const { ctx, p } = await open("/technologies/holofan").catch(() => ({})); if (p) { ctx.close && await ctx.close(); } }

  ok("no uncaught page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  console.log(out.join("\n")); await b.close();
})();
