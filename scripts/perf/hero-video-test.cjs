/*
 * Hero video lag investigation. The YouTube embed is replaced by a stub page that plays a LOCAL 1080p test clip in a real <video>,
 * and reports dropped/total decoded frames from getVideoPlaybackQuality(). The page around it is the real homepage, so overlapping
 * effects (pointer parallax of the video layer, spotlight, copy layer) are real. The stub speaks the same postMessage protocol
 * (state, mute, volume). Headless Chromium renders in software: compare variants, do not read absolute numbers as device numbers.
 * Usage: NODE_PATH=$(npm root -g) node scripts/perf/hero-video-test.cjs http://localhost:3300 clip.webm [variantsJson]
 */
const { chromium } = require("playwright");
const fs = require("fs");
const BASE = process.argv[2] || "http://localhost:3300";
const CLIP = fs.readFileSync(process.argv[3]);
const VARIANTS = process.argv[4] ? JSON.parse(process.argv[4]) : { base: "" };
const RATE = +(process.env.CPU || 1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STUB = `<!doctype html><body style="margin:0;background:#000;overflow:hidden"><video id=v src="https://www.youtube-nocookie.com/clip.webm" muted loop autoplay playsinline style="width:100vw;height:100vh;object-fit:cover"></video><script>
 var v=document.getElementById('v'); var st=-1;
 function info(){var q=v.getVideoPlaybackQuality();parent.postMessage(JSON.stringify({event:'infoDelivery',info:{playerState:st,muted:v.muted,volume:100,__q:{d:q.droppedVideoFrames,t:q.totalVideoFrames}}}),'*')}
 function send(s){st=s;parent.postMessage(JSON.stringify({event:'onStateChange',info:s}),'*')}
 v.addEventListener('playing',function(){send(1)});v.addEventListener('pause',function(){send(2)});
 setInterval(info,250);
 window.addEventListener('message',function(e){var d={};try{d=JSON.parse(e.data)}catch(_){return}
  if(d.event==='command'){ if(d.func==='pauseVideo')v.pause(); if(d.func==='playVideo')v.play(); if(d.func==='mute')v.muted=true; if(d.func==='unMute')v.muted=false; info(); }
 });</script></body>`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium", args: ["--autoplay-policy=no-user-gesture-required"] });
  const out = {};
  for (const [name, css] of Object.entries(VARIANTS)) {
    for (const [vname, vw, vh, dpr] of [["desktop", 1440, 900, 1], ["mobile", 390, 844, 2]]) {
      const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr });
      await ctx.route(/youtube-nocookie\.com\/clip\.webm/, (r) => r.fulfill({ status: 200, contentType: "video/webm", body: CLIP }));
      await ctx.route(/youtube-nocookie\.com\/embed/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: STUB }));
      await ctx.route(/i\.ytimg\.com/, (r) => r.abort());
      const p = await ctx.newPage();
      await p.addInitScript(() => { window.__q = null; window.__f = []; addEventListener("message", (e) => { try { const d = JSON.parse(e.data); if (d.info && d.info.__q) window.__q = d.info.__q; } catch (_) {} }); const loop = (t) => { window.__f.push(t); requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
      if (RATE > 1) { const cdp = await ctx.newCDPSession(p); await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE }); }
      await p.goto(BASE + "/", { waitUntil: "load" });
      if (css) await p.addStyleTag({ content: css });
      await p.waitForSelector(".rh-yt[data-on]", { timeout: 15000 }).catch(() => {});
      await sleep(1500);
      const res = {};
      const run = async (label, fn, ms) => {
        await p.evaluate(() => { window.__f = []; });
        const q0 = await p.evaluate(() => window.__q);
        await fn(); await sleep(150);
        const [q1, fr] = await p.evaluate(() => [window.__q, window.__f.slice()]);
        const iv = fr.slice(1).map((t, i) => t - fr[i]); iv.sort((a, c) => a - c);
        const sum = iv.reduce((a, c) => a + c, 0);
        res[label] = { frames: q1 && q0 ? q1.t - q0.t : null, dropped: q1 && q0 ? q1.d - q0.d : null, pageFps: +(iv.length / (sum / 1000)).toFixed(1), p95ms: +(iv[Math.floor(iv.length * 0.95)] || 0).toFixed(1), over33: iv.filter((x) => x > 33.4).length };
      };
      await run("idle 5s", () => sleep(5000));
      if (vname === "desktop") await run("pointer sweep 6s", async () => { const t0 = Date.now(); while (Date.now() - t0 < 6000) { const k = (Date.now() - t0) / 6000; await p.mouse.move(100 + 1200 * (0.5 + 0.5 * Math.sin(k * 14)), 150 + 600 * (0.5 + 0.5 * Math.cos(k * 9))); await sleep(16); } });
      await run("scroll through hero 4s", async () => { for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, 14); await sleep(50); } await p.evaluate(() => scrollTo(0, 0)); await sleep(100); });
      out[name + " | " + vname] = res;
      await ctx.close();
    }
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
