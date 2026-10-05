/*
 * Uploaded image replaces decorative fallback artwork. Needs a build where slots capEvents (valid image "t-ok"), capCentres (broken URL) and
 * contactScene (valid) are assigned and capPermanent is empty; see docs/design/media-handover/README.md for the test-asset patch.
 * NODE_PATH=$(npm root -g) node scripts/perf/media-handover-test.cjs http://localhost:3300 [outdir]
 */
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3300"; const OUT = process.argv[3];
const out = []; const ok = (n, c, d = "") => out.push((c ? "PASS " : "FAIL ") + n + (d ? " - " + d : ""));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const vis = (sel) => `(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const cs = getComputedStyle(e); return cs.display !== "none" && cs.visibility !== "hidden"; })()`;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
  for (const [view, w, h, dpr, mobile] of [["desktop", 1440, 900, 1, false], ["mobile", 390, 844, 2, true]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: mobile, isMobile: mobile });
    await ctx.route(/youtube|ytimg/, (r) => r.abort());
    const p = await ctx.newPage();
    await p.goto(BASE + "/", { waitUntil: "load" });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } });
    for (let k = 0; k < 3; k++) { await p.evaluate(() => { const r = document.querySelector("#capabilities .cap-grid").getBoundingClientRect(); scrollTo(0, scrollY + r.top - 100); }); await sleep(900); }
    const st = await p.evaluate(() => [...document.querySelectorAll(".pc2")].map((c) => ({ media: c.dataset.media || "none", art: getComputedStyle(c.querySelector(".pc2-art")).display !== "none", floor: getComputedStyle(c.querySelector(".pc2-floor")).display !== "none", photoOpacity: c.querySelector(".pc2-photo") ? +getComputedStyle(c.querySelector(".pc2-photo")).opacity : null, title: !!c.querySelector(".pc2-t").textContent, go: !!c.querySelector(".pc2-go") })));
    ok(`${view}: card with a loaded photo hides its line illustration`, st[0].media === "loaded" && !st[0].art && !st[0].floor, JSON.stringify(st[0]));
    ok(`${view}: that photo is clearly visible`, st[0].photoOpacity >= 0.85, String(st[0].photoOpacity));
    ok(`${view}: card with a broken image URL keeps its designed fallback`, st[1].media === "failed" && st[1].art, JSON.stringify(st[1]));
    ok(`${view}: card without an image keeps its designed fallback`, st[2].media === "none" && st[2].art, JSON.stringify(st[2]));
    ok(`${view}: titles and links preserved on all cards`, st.every((s) => s.title && s.go));
    ok(`${view}: broken image leaves no broken-image icon or alt text`, await p.evaluate(() => { const i = document.querySelectorAll(".pc2")[1].querySelector("img.photo"); return !i || getComputedStyle(i).display === "none"; }));
    if (OUT) { await p.mouse.move(w / 2, 5); await p.screenshot({ path: `${OUT}/${view}-capabilities.png` }); }
    // team portraits: a real portrait hides the monogram artwork
    for (let k = 0; k < 3; k++) { await p.evaluate(() => { const g = document.querySelector("#people .tg-stage"); if (g) scrollTo(0, g.getBoundingClientRect().top + scrollY - 100); }); await sleep(800); }
    const tg = await p.evaluate(() => { const f = [...document.querySelectorAll(".tg-face[data-media]")]; const loaded = f.find((x) => x.dataset.media === "loaded"); return { n: f.length, loaded: !!loaded, monoHidden: loaded ? getComputedStyle(loaded.querySelector(".tg-mono")).display === "none" : null }; });
    ok(`${view}: team card with a loaded portrait hides its monogram`, tg.loaded && tg.monoHidden === true, JSON.stringify(tg));
    await p.close();

    // contact: loaded / failed (image requests blocked)
    for (const [label, block] of [["loaded", false], ["broken image", true]]) {
      const c2 = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: mobile, isMobile: mobile });
      if (block) await c2.route(/\/photos\/t-ok-/, (r) => r.abort());
      const q = await c2.newPage(); await q.goto(BASE + "/contact", { waitUntil: "load" }); await sleep(1500);
      const s = await q.evaluate(() => ({ media: document.querySelector(".ct-hero").dataset.media || "none", beam: getComputedStyle(document.querySelector(".ct-stage .beam")).display !== "none", shard: getComputedStyle(document.querySelector(".ct-stage .shard")).display !== "none", photo: document.querySelector(".ct-scene .photo") ? +getComputedStyle(document.querySelector(".ct-scene .photo")).opacity : null, h1: !!document.querySelector(".ct-hero h1"), form: !!document.querySelector("form") }));
      if (!block) ok(`${view}: contact photo replaces beams and shards`, s.media === "loaded" && !s.beam && !s.shard && s.photo >= 0.8, JSON.stringify(s));
      else ok(`${view}: contact with a broken image brings the designed stage back`, s.media === "failed" && s.beam && s.shard, JSON.stringify(s));
      ok(`${view}: contact (${label}) keeps heading and form`, s.h1 && s.form);
      if (OUT) await q.screenshot({ path: `${OUT}/${view}-contact-${block ? "broken" : "loaded"}.png` });
      await c2.close();
    }

    // no flash: slow image, sample artwork visibility every frame while it loads
    for (const [pageName, path, sel] of [["capability card", "/", ".pc2:first-child .pc2-art"], ["contact stage", "/contact", ".ct-stage .beam"]]) {
      const c3 = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: mobile, isMobile: mobile });
      await c3.route(/youtube|ytimg/, (r) => r.abort());
      await c3.route(/\/photos\/t-ok-/, async (r) => { await sleep(1600); await r.continue(); });
      await c3.addInitScript(([sel]) => { window.__seen = 0; window.__frames = 0; const tick = () => { const e = document.querySelector(sel); if (e) { window.__frames++; const cs = getComputedStyle(e); if (cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.02) window.__seen++; } requestAnimationFrame(tick); }; requestAnimationFrame(tick); }, [sel]);
      const q = await c3.newPage(); await q.goto(BASE + path, { waitUntil: "domcontentloaded" });
      for (let k = 0; k < 14; k++) { await q.evaluate(() => { const g = document.querySelector("#capabilities .cap-grid"); if (g) scrollTo(0, g.getBoundingClientRect().top + scrollY - 100); }); await sleep(250); }
      await sleep(1500);
      const r = await q.evaluate(() => ({ seen: window.__seen, frames: window.__frames }));
      ok(`${view}: no illustration visible on a ${pageName} at any frame while its photo loads`, r.frames > 20 && r.seen === 0, JSON.stringify(r));
      await c3.close();
    }
    await ctx.close();
  }
  console.log(out.join("\n")); await b.close();
})();
