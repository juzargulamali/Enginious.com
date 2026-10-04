// Behaviour checks for the Digital Atrium hero. YouTube is stubbed (the sandbox cannot reach it).
//   NODE_PATH=$(npm root -g) node scripts/perf/atrium-test.cjs http://localhost:3300
const { chromium } = require("playwright");
const sharp = require("sharp");
const BASE = process.argv[2] || "http://localhost:3300";
const out = []; const ok = (n, c, d = "") => out.push((c ? "PASS " : "FAIL ") + n + (d ? " - " + d : ""));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STUB = `<!doctype html><meta name="color-scheme" content="dark"><body style="margin:0;background:transparent"><script>
 var st=-1; function send(s){st=s; parent.postMessage(JSON.stringify({event:'onStateChange',info:s}),'*')}
 window.addEventListener('message',function(e){var d={};try{d=JSON.parse(e.data)}catch(_){return}
  if(d.event==='listening'){ if(st<0) setTimeout(function(){send(1)},300) }
  if(d.event==='command'){ if(d.func==='pauseVideo')send(2); if(d.func==='playVideo')send(1); } });</script></body>`;
async function ctxFor(b, opts = {}) {
  const img = await sharp({ create: { width: 640, height: 360, channels: 3, background: "#0a2a36" } }).jpeg().toBuffer();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  await ctx.route(/youtube-nocookie\.com\/embed/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: STUB }));
  await ctx.route(/i\.ytimg\.com/, (r) => r.fulfill({ status: 200, contentType: "image/jpeg", body: img }));
  return ctx;
}
const tr = (p, sel) => p.evaluate((s) => getComputedStyle(document.querySelector(s)).transform, sel);
const mat = (t) => { const m = /matrix(3d)?\(([^)]+)\)/.exec(t); if (!m) return { tx: 0, ty: 0, raw: t }; const v = m[2].split(",").map(Number); return m[1] ? { tx: v[12], ty: v[13], raw: t } : { tx: v[4], ty: v[5], raw: t }; };

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errs = [];

  // ---------- desktop 1440 / 1280
  for (const [w, h] of [[1440, 900], [1280, 800]]) {
    const ctx = await ctxFor(b, { viewport: { width: w, height: h } });
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(BASE + "/", { waitUntil: "load" }); await sleep(2500);
    const g = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); const rs = r(".rs"), h1 = r(".rh-copy h1"), sc = r(".rh-screen"), sub = r(".rh-sub"), cta = r(".rh-cta"); return { stripBottom: rs.bottom, stripTop: rs.top, vh: innerHeight, h1Right: h1.right, sub: sub.right, ctaBottom: cta.bottom, screenLeft: sc.left, screenW: sc.width, screenH: sc.height, overflow: document.documentElement.scrollWidth > innerWidth + 1, hero: r(".rh").height }; });
    ok(`${w}: Dubai, Riyadh and Poland strip is inside the first viewport`, g.stripBottom <= g.vh && g.stripTop > 0, JSON.stringify({ top: g.stripTop, bottom: g.stripBottom, vh: g.vh }));
    ok(`${w}: headline, description and actions sit clear of the screen (no overlap)`, g.h1Right < g.screenLeft - 8 && g.sub < g.screenLeft - 8, `h1 ${Math.round(g.h1Right)} sub ${Math.round(g.sub)} screen ${Math.round(g.screenLeft)}`);
    ok(`${w}: actions are above the regional strip`, g.ctaBottom < g.stripTop - 10, `${Math.round(g.ctaBottom)} < ${Math.round(g.stripTop)}`);
    ok(`${w}: no horizontal overflow`, !g.overflow);
    ok(`${w}: the screen is a real 16:9 showreel frame`, Math.abs(g.screenW / g.screenH - 16 / 9) < 0.12, `${(g.screenW / g.screenH).toFixed(2)}`);
    if (w === 1440) {
      // composited layers: only the three depth layers carry will-change-free transforms; no will-change anywhere in the hero
      const wc = await p.evaluate(() => [...document.querySelectorAll(".rh, .rh *")].filter((e) => getComputedStyle(e).willChange !== "auto" && !e.classList.contains("nx-c")).map((e) => e.className.toString()));
      ok("no will-change on any hero layer (only the shared neon cursor keeps its own)", wc.length === 0, wc.join(","));
      const nodes = await p.evaluate(() => document.querySelectorAll(".rh *").length);
      ok("hero DOM stays small (the old hero had 61)", nodes < 200, String(nodes));
      // at rest: no inline transforms were written (the CSS pose is the resting composition)
      const rest = await p.evaluate(() => [".rh-planes", ".rh-mid", ".rh-copy-a"].map((s) => document.querySelector(s).getAttribute("style")));
      ok("complete before any interaction: nothing has been written to the layers", rest.every((x) => !x), JSON.stringify(rest));
      // pointer parallax: far right, then away
      const before = { env: mat(await tr(p, ".rh-planes")), mid: await tr(p, ".rh-mid"), fg: mat(await tr(p, ".rh-copy-a")) };
      await p.mouse.move(1400, 450); await sleep(150);
      const wcDuring = await p.evaluate(() => document.querySelector(".rh-planes").style.willChange + "/" + document.querySelector(".rh-copy-a").style.willChange);
      await sleep(1350);
      const right = { env: mat(await tr(p, ".rh-planes")), mid: mat(await tr(p, ".rh-mid")), fg: mat(await tr(p, ".rh-copy-a")) };
      const de = Math.abs(right.env.tx - before.env.tx), df = Math.abs(right.fg.tx - before.fg.tx);
      ok("pointer moves the layers", de > 0.5 && df > 0.5, `env ${de.toFixed(1)}px fg ${df.toFixed(1)}px`);
      ok("planes (deepest moving layer) move less than the screen, which moves less than the foreground", de < Math.abs(right.mid.tx) && Math.abs(right.mid.tx) < df, `env ${de.toFixed(1)} < mid ${Math.abs(right.mid.tx).toFixed(1)} < fg ${df.toFixed(1)}`);
      ok("movement stays small enough to read (foreground under 14px)", df < 14, `${df.toFixed(1)}px`);
      await p.mouse.move(700, 450); await sleep(80);
      await p.evaluate(() => { document.querySelector(".rh").dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" })); });
      await sleep(2500);
      const back = { env: mat(await tr(p, ".rh-planes")), fg: mat(await tr(p, ".rh-copy-a")) };
      const wcAfter = await p.evaluate(() => document.querySelector(".rh-planes").style.willChange + "|" + document.querySelector(".rh-mid").style.willChange + "|" + document.querySelector(".rh-copy-a").style.willChange);
      ok("layers are promoted only while moving (will-change set during, released at rest)", wcDuring === "transform/transform" && wcAfter === "||", `during ${wcDuring}, after ${wcAfter}`);
      ok("returns to the resting composition when the pointer leaves", Math.abs(back.env.tx) < 0.3 && Math.abs(back.fg.tx) < 0.3, `env ${back.env.tx.toFixed(2)} fg ${back.fg.tx.toFixed(2)}`);
      // idle: the scheduler sleeps (no style writes while nothing moves)
      const muts = await p.evaluate(() => new Promise((res) => { let n = 0; const mo = new MutationObserver((r) => { n += r.length; }); document.querySelectorAll(".rh-planes, .rh-mid, .rh-copy-a, .rh-copy-b").forEach((e) => mo.observe(e, { attributes: true })); setTimeout(() => { mo.disconnect(); res(n); }, 1500); }));
      ok("idle: no style writes while nothing is moving", muts === 0, String(muts));
      // buttons hold still: put the pointer on the primary button, then check it does not drift
      await p.mouse.move(300, 300); await sleep(900);
      const btnBox = async () => { const b2 = await p.getByRole("link", { name: /Start a project/ }).nth(1).boundingBox(); return b2 ? Math.round(b2.x * 10) / 10 + "," + Math.round(b2.y * 10) / 10 : "none"; };
      const bb = await btnBox(); await p.mouse.move(210, 590); await sleep(60); const b1 = await btnBox(); await sleep(450); const b2 = await btnBox();
      ok("a button holds still under the pointer (no drift after the pointer lands on it)", b1 === b2, `${bb} -> ${b1} -> ${b2}`);
      // scroll transition
      await p.evaluate(() => window.scrollTo(0, 450)); await sleep(600);
      const sc = { pl: mat(await tr(p, ".rh-planes")), mid: mat(await tr(p, ".rh-mid")), fg: mat(await tr(p, ".rh-copy-a")) };
      ok("scroll: nearer layers leave faster (copy > screen > planes), the environment stays put", Math.abs(sc.fg.ty) > Math.abs(sc.mid.ty) && Math.abs(sc.mid.ty) > Math.abs(sc.pl.ty) && Math.abs(sc.pl.ty) > 2, `planes ${sc.pl.ty.toFixed(1)} screen ${sc.mid.ty.toFixed(1)} copy ${sc.fg.ty.toFixed(1)}`);
      const envMoved = await p.evaluate(() => [".rh-env", ".at-frame"].map((x) => document.querySelector(x).getAttribute("style") || getComputedStyle(document.querySelector(x)).transform).join("|"));
      ok("the environment and the dark opening are static (never transformed)", /^none\|none$/.test(envMoved), envMoved);
      await p.evaluate(() => window.scrollTo(0, 4000)); await sleep(500);
      const m2 = await p.evaluate(() => new Promise((res) => { let n = 0; const mo = new MutationObserver((r) => { n += r.length; }); document.querySelectorAll(".rh-planes, .rh-mid").forEach((e) => mo.observe(e, { attributes: true })); setTimeout(() => { mo.disconnect(); res(n); }, 1000); }));
      ok("off-screen: no animation work", m2 === 0, String(m2));
      await p.evaluate(() => window.scrollTo(0, 0)); await sleep(400);
      // the screen and the buttons
      await p.locator(".rh-screen").click({ position: { x: 200, y: 120 } }); await sleep(400);
      ok("clicking the lit screen opens the showreel lightbox", (await p.locator("dialog.reel-dialog[open]").count()) === 1);
      await p.keyboard.press("Escape"); await sleep(300);
      // region links
      for (const [name, href] of [["Dubai", "/uae"], ["Riyadh", "/saudi-arabia"], ["Poland", "/europe"]]) {
        const l = p.locator(`.rs a`, { hasText: name });
        ok(`regional link ${name} -> ${href}`, (await l.getAttribute("href")) === href && (await l.isVisible()));
        const box = await l.boundingBox();
        ok(`${name} link is easy to target (>=44px tall)`, box && box.height >= 44, String(box && Math.round(box.height)));
      }
      // project brief + navigation still work
      await p.getByRole("button", { name: /Project brief/ }).first().click().catch(() => {}); await sleep(400);
      ok("project brief control opens", (await p.locator('[role="dialog"], [data-brief-open], .brief-panel, .brief-menu').count()) >= 1 || (await p.getByText(/brief is empty|Your brief|Project brief/i).count()) >= 2);
      await p.keyboard.press("Escape");
      const nav = await p.evaluate(() => [...document.querySelectorAll(".site-header nav a")].map((a) => a.textContent.trim()));
      ok("main navigation unchanged", ["Work", "Technologies", "Solutions", "Company", "Team", "Insights"].every((n) => nav.includes(n)) && ["UAE", "Saudi Arabia", "Europe"].every((n) => nav.includes(n)), nav.join("|"));
      // keyboard: tab through the hero
      await p.goto(BASE + "/", { waitUntil: "load" }); await sleep(2200);   // fresh page: the brief panel above may still be open
      const seq = [];
      for (let i = 0; i < 24; i++) { await p.keyboard.press("Tab"); const t = await p.evaluate(() => { const e = document.activeElement; return e && e.closest(".rh, .site-header") ? { in: e.closest(".rh") ? "hero" : "header", name: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 40), outline: getComputedStyle(e).outlineStyle + "/" + getComputedStyle(e).boxShadow.slice(0, 20) } : null; }); if (t && t.in === "hero") seq.push(t); }
      const names = seq.map((s) => s.name);
      ok("keyboard reaches pause, both actions and all three regions in reading order", ["Pause background video", "Start a project", "Watch the showreel", "Dubai", "Riyadh", "Poland"].every((n, i) => (names[i] || "").includes(n)), names.join(" | "));
      ok("no decorative geometry is focusable or exposed", (await p.evaluate(() => [...document.querySelectorAll(".rh-env, .at-frame, .rh-planes")].every((e) => e.closest("[aria-hidden='true']") || e.getAttribute("aria-hidden") === "true"))));
      await p.screenshot({ path: "/tmp/claude-0/atrium/test-focus.png" });
    }
    await ctx.close();
  }

  // ---------- reduced motion: a fully composed static scene
  {
    const ctx = await ctxFor(b, { reducedMotion: "reduce" });
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(BASE + "/", { waitUntil: "load" }); await sleep(1800);
    await p.mouse.move(1300, 400); await sleep(700); await p.mouse.move(300, 700); await sleep(700);
    const styles = await p.evaluate(() => [".rh-planes", ".rh-mid", ".rh-copy-a"].map((s) => document.querySelector(s).getAttribute("style")));
    ok("reduced motion: pointer does nothing (layers untouched)", styles.every((x) => !x), JSON.stringify(styles));
    ok("reduced motion: no iframe is ever created", (await p.locator(".rh-yt").count()) === 0);
    ok("reduced motion: the play cue stays visible on the screen", (await p.locator(".rh-playcue").count()) === 1 && (await p.locator(".rh-playcue[data-hide]").count()) === 0);
    await p.evaluate(() => window.scrollTo(0, 300)); await sleep(400);
    ok("reduced motion: scrolling does not move the layers", !(await p.evaluate(() => document.querySelector(".rh-planes").getAttribute("style"))));
    await ctx.close();
  }

  // ---------- phone 390 and small tablet
  for (const [w, h, label] of [[390, 844, "390"], [430, 932, "430"], [768, 1024, "768"]]) {
    const ctx = await ctxFor(b, { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message));
    await p.goto(BASE + "/", { waitUntil: "load" }); await sleep(2200);
    const g = await p.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); const rs = r(".rs"), h1 = r(".rh-copy h1"), cta = r(".rh-cta .btn-primary"), sc = r(".rh-screen"); return { stripTop: rs.top, stripBottom: rs.bottom, h1Top: h1.top, ctaBottom: cta.bottom, ctaTop: cta.top, screenW: sc.width, vw: innerWidth, vh: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth + 1, bodyOverflow: document.body.scrollWidth > innerWidth + 1 }; });
    ok(`${label}: no horizontal overflow`, !g.overflow && !g.bodyOverflow);
    ok(`${label}: headline, the primary action and the regional strip start inside the first screen`, g.h1Top < g.vh * 0.5 && g.ctaTop < g.vh && g.stripTop < g.vh, JSON.stringify({ h1: Math.round(g.h1Top), cta: Math.round(g.ctaTop), strip: Math.round(g.stripTop), vh: g.vh }));
    ok(`${label}: the framed showreel fits the width`, g.screenW <= g.vw, `${Math.round(g.screenW)} of ${g.vw}`);
    ok(`${label}: no pointer-dependent content (no transforms written by touch)`, !(await p.evaluate(() => document.querySelector(".rh-planes").getAttribute("style"))));
    const links = await p.evaluate(() => [...document.querySelectorAll(".rs a")].map((a) => { const r = a.getBoundingClientRect(); return Math.round(r.height); }));
    ok(`${label}: regional links are easy to tap (>=40px)`, links.every((x) => x >= 40), links.join(","));
    if (label === "390") await p.screenshot({ path: "/tmp/claude-0/atrium/test-390.png" });
    await ctx.close();
  }

  ok("no uncaught page errors", errs.length === 0, errs.join(" | "));
  console.log(out.join("\n")); console.log(`\n${out.filter((x) => x.startsWith("PASS")).length} passed, ${out.filter((x) => x.startsWith("FAIL")).length} failed`);
  await b.close(); process.exit(out.some((x) => x.startsWith("FAIL")) ? 1 : 0);
})();
