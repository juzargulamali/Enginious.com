// Hero mute/unmute checks. YouTube is stubbed by a page that speaks the player's postMessage protocol (state, mute, volume).
// NODE_PATH=$(npm root -g) node scripts/perf/hero-sound-test.cjs http://localhost:3300
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3300";
const out = []; const ok = (n, c, d = "") => out.push((c ? "PASS " : "FAIL ") + n + (d ? " - " + d : ""));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stub = (refuse) => `<!doctype html><body style="margin:0;background:#123"><script>
 var st=-1, muted=true, vol=100, cmds=[];
 function info(){parent.postMessage(JSON.stringify({event:'infoDelivery',info:{playerState:st,muted:muted,volume:vol}}),'*')}
 function send(s){st=s;parent.postMessage(JSON.stringify({event:'onStateChange',info:s}),'*')}
 window.addEventListener('message',function(e){var d={};try{d=JSON.parse(e.data)}catch(_){return}
  if(d.event==='listening'){ if(st<0) setTimeout(function(){send(1);info()},300) }
  if(d.event==='command'){ parent.postMessage(JSON.stringify({event:'ack',func:d.func}),'*');
   if(d.func==='pauseVideo')send(2); if(d.func==='playVideo')send(1);
   if(d.func==='mute'){muted=true;} if(d.func==='unMute'&&!${refuse}){muted=false;} if(d.func==='setVolume'&&!${refuse}){vol=d.args[0];}
   info(); }
 });</script>stub</body>`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
  const errs = [];
  const open = async (opts = {}, { refuse = false, block = false } = {}) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
    const cmds = [];
    await ctx.addInitScript(() => addEventListener("message", (e) => { try { const d = JSON.parse(e.data); if (d.event === "ack") (window.__cmds = window.__cmds || []).push(d.func); } catch (_) {} }));
    if (block) await ctx.route(/youtube-nocookie\.com\/embed/, (r) => r.abort());
    else await ctx.route(/youtube-nocookie\.com\/embed/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: stub(refuse) }));
    await ctx.route(/i\.ytimg\.com/, (r) => r.abort());
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(String(e)));
    await p.goto(BASE + "/", { waitUntil: "load" });
    return { ctx, p, cmds };
  };
  const btn = (p) => p.locator(".rh-sound");
  const cmdsOf = (p) => p.evaluate(() => window.__cmds || []);

  // 1. main flow
  { const { ctx, p } = await open();
    await p.waitForSelector(".rh-yt[data-on]", { timeout: 10000 });
    await p.waitForSelector(".rh-sound", { timeout: 5000 }).catch(() => {});
    ok("starts muted: embed url has mute=1", (await p.locator(".rh-yt").getAttribute("src")).includes("mute=1"));
    ok("control appears once the player reports its state", await btn(p).count() === 1);
    ok("label says Unmute video while muted", (await btn(p).getAttribute("aria-label")) === "Unmute video");
    await btn(p).click(); await sleep(700);
    ok("Unmute sends the supported unMute command", (await cmdsOf(p)).includes("unMute"));
    ok("label follows the player: Mute video", (await btn(p).getAttribute("aria-label")) === "Mute video");
    await btn(p).focus(); await p.keyboard.press("Enter"); await sleep(700);
    ok("keyboard Enter mutes again", (await btn(p).getAttribute("aria-label")) === "Unmute video" && (await cmdsOf(p)).includes("mute"));
    await p.keyboard.press("Space"); await sleep(700);
    ok("keyboard Space unmutes", (await btn(p).getAttribute("aria-label")) === "Mute video");
    // pause keeps sound state; pause control still works
    await p.locator(".rh-pause").click(); await sleep(500);
    ok("pause leaves the sound state alone", (await btn(p).getAttribute("aria-label")) === "Mute video" && await btn(p).count() === 1);
    await p.locator(".rh-pause").click(); await sleep(400);
    // lightbox silences the background
    const before = (await cmdsOf(p)).filter((c) => c === "mute").length;
    await p.getByRole("button", { name: /Watch the showreel/ }).click(); await sleep(700);
    ok("opening the showreel lightbox mutes the background", (await cmdsOf(p)).filter((c) => c === "mute").length > before && (await btn(p).getAttribute("aria-label")) === "Unmute video");
    await p.keyboard.press("Escape"); await sleep(500);
    ok("closing the lightbox does not turn the background sound back on", (await btn(p).getAttribute("aria-label")) === "Unmute video");
    await ctx.close(); }

  // 2. player refuses to unmute: label stays truthful
  { const { ctx, p } = await open({}, { refuse: true });
    await p.waitForSelector(".rh-sound", { timeout: 10000 });
    await btn(p).click(); await sleep(800);
    ok("if the player stays muted the label stays Unmute video", (await btn(p).getAttribute("aria-label")) === "Unmute video");
    await ctx.close(); }

  // 3. player unavailable / poster only: no control
  { const { ctx, p } = await open({}, { block: true }); await sleep(2500);
    ok("player unavailable: no sound control", (await btn(p).count()) === 0 && (await p.locator(".rh-pause").count()) === 0);
    await ctx.close(); }
  { const { ctx, p } = await open({ reducedMotion: "reduce" }); await sleep(1800);
    ok("reduced motion: no player and no sound control", (await p.locator(".rh-yt").count()) === 0 && (await btn(p).count()) === 0);
    await ctx.close(); }

  // 4. off-screen pause / resume
  { const { ctx, p } = await open(); await p.waitForSelector(".rh-sound", { timeout: 10000 });
    await p.evaluate(() => document.querySelector("#capabilities").scrollIntoView()); await sleep(900);
    ok("scrolled away: background video is paused", (await cmdsOf(p)).includes("pauseVideo"));
    await p.evaluate(() => scrollTo(0, 0)); await sleep(900);
    ok("scrolled back: background video resumes", (await cmdsOf(p)).filter((c) => c === "playVideo").length >= 1);
    await ctx.close(); }

  // 5. geometry: clear of headline, actions and regional links; touch target size
  for (const [w, h] of [[1920, 1080], [1440, 900], [1280, 720], [768, 1024], [430, 932], [390, 844]]) {
    const { ctx, p } = await open({ viewport: { width: w, height: h }, hasTouch: w < 900 });
    await p.waitForSelector(".rh-sound", { timeout: 10000 }); await sleep(600);
    const r = await p.evaluate(() => { const rc = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
      const hit = (a, c) => a && c && a.l < c.r && a.r > c.l && a.t < c.b && a.b > c.t;
      const s = rc(".rh-sound"); const cta = [...document.querySelectorAll(".rh-cta .btn")].map((e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; });
      const h1 = rc(".rh-copy h1"), sub = rc(".rh-sub"), strip = rc(".rs"), pause = rc(".rh-pause");
      return { size: [s.w, s.h], h1: hit(s, h1), sub: hit(s, sub), cta: cta.some((c) => hit(s, c)), strip: hit(s, strip) || hit(pause, strip), pause: hit(s, pause), inView: s.r <= innerWidth && s.l >= 0 && s.t >= 0 && s.b <= innerHeight + 2000 }; });
    ok(`${w}px: sound control clear of headline, actions, regional links and pause`, !r.h1 && !r.sub && !r.cta && !r.strip && !r.pause, JSON.stringify(r));
    if (w < 900) ok(`${w}px: touch target at least 44px`, r.size[0] >= 44 && r.size[1] >= 44, r.size.join("x"));
    await ctx.close();
  }
  ok("no uncaught page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  console.log(out.join("\n")); await b.close();
})();
