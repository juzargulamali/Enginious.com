// Technologies showroom animation lifecycle, reduced motion and swipe-click suppression (stand-in animated WebP). (LOCAL stand-ins): no placeholders, CMS editing (save/reload/publish/empty), region routing,
// every published project/technology has a page, drafts stay private, SEO metadata. Video playback of real YouTube is NOT covered here (stubs elsewhere).
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const { adoptAll } = require("./lib-adopt.cjs");
const BASE = process.argv[2] || "http://localhost:3300";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log("  PASS " + name); } else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); } };
const get = async (p) => { const r = await fetch(BASE + p, { redirect: "manual" }); return { status: r.status, text: await r.text() }; };
const publish = (p) => p.getByRole("button", { name: /Save and (publish|update live page)/ }).click().then(() => p.waitForFunction(() => /Published\. The public page/.test(document.body.innerText), null, { timeout: 25000 })).then(() => sleep(900));

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const login = async (email) => { const c = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await c.newPage(); await p.goto(BASE + "/admin/login", { waitUntil: "load" }); await p.fill("#email", email); await p.fill("#password", "correct-horse-battery"); await p.click('button[type="submit"]'); await p.waitForURL(/\/admin\/?$/); return { c, p }; };
  const admin = await login("admin@test.local");
  await adoptAll(admin.p, BASE, ["technology", "setting"]);
  const { p } = await login("editor@test.local");
  const fs2 = require("fs");
  const ANIM = process.env.ANIM || "/tmp/claude-0/assets/t-anim.webp";
  const create = async (title) => { await p.goto(BASE + "/admin/content/technology/new", { waitUntil: "load" }); await sleep(300); await p.fill("#title", title); await p.getByRole("button", { name: "Create draft" }).click(); await p.waitForURL(/\/admin\/content\/technology\/[0-9a-f-]{36}$/); };
  const sharp = require("sharp");
  const still = await sharp({ create: { width: 600, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: Buffer.from('<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><circle cx="200" cy="200" r="190" fill="#27cdd8"/></svg>'), top: 100, left: 100 }]).png().toBuffer();
  const up = async (name, alt, buffer, mime) => { await p.goto(BASE + "/admin/media", { waitUntil: "load" }); await p.selectOption("#up-kind", "scene"); await p.selectOption("#up-status", "stock"); await p.selectOption("#up-vis", "public"); await p.fill("#up-alt", alt); await p.locator("#up-file").setInputFiles({ name, mimeType: mime, buffer }); await p.getByRole("button", { name: "Upload", exact: true }).click(); await p.waitForURL(/\/admin\/media\/[a-z0-9-]+$/, { timeout: 20000 }).catch(() => {}); await sleep(500); };
  await up("still.png", "Stand-in still", still, "image/png"); await up("anim.webp", "Stand-in animation", fs2.readFileSync(ANIM), "image/webp");
  const pick = async (key, alt) => { await p.locator(`[data-field="${key}"]`).getByRole("button", { name: /Choose/ }).click(); await p.getByRole("dialog").getByRole("button", { name: new RegExp(alt) }).first().click(); };
  for (const name of ["Anim Alpha", "Anim Beta"]) { await create(name); await p.locator('[data-field="category"] select').selectOption("kinetic"); await p.fill("textarea >> nth=0", `${name} summary.`); await pick("showcase_image", "Stand-in still"); await pick("showcase_animation", "Stand-in animation"); await publish(p); }

  const cx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const pg = await cx.newPage(); const errs = []; pg.on("pageerror", (e) => errs.push(String(e)));
  await pg.goto(BASE + "/technologies", { waitUntil: "load" }); await sleep(800);
  await pg.locator(".showroom .chip", { hasText: /^Kinetic$/ }).click(); await sleep(500);
  const anims = () => pg.evaluate(() => [...document.querySelectorAll("img.exh-anim")].map((i) => i.closest(".exhibit").querySelector(".lbl").textContent));
  const settled = async (name, ms = 2500) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const a = await anims(); if (a.length === 1 && a[0] === name) return true; await sleep(150); } return false; };
  const away = async () => { await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(500); };
  const back = async () => { await pg.locator(".showroom .stage").scrollIntoViewIfNeeded(); await sleep(300); };
  const select = async (name) => { await pg.locator(".exhibit", { hasText: name }).first().click(); await sleep(300); };
  const selected = () => pg.evaluate(() => document.querySelector('.exhibit[data-on="true"] .lbl')?.textContent);

  await select("Anim Alpha");
  ok("selecting an animated technology plays its animation, one mounted", await settled("Anim Alpha"), JSON.stringify(await anims()));
  await away(); ok("scrolling away stops the animation (none mounted)", (await anims()).length === 0, JSON.stringify(await anims()));
  await back(); ok("scrolling back resumes the SAME selected animation, only one mounted", await settled("Anim Alpha"), JSON.stringify(await anims()));
  // tab switch
  await pg.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); }); await sleep(300);
  ok("switching to another tab stops the animation", (await anims()).length === 0);
  await pg.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
  ok("returning to the tab resumes the selected animation, one mounted", await settled("Anim Alpha"), JSON.stringify(await anims()));
  // change selection while off-screen
  await away(); await pg.evaluate(() => { [...document.querySelectorAll(".exhibit")].find((e) => e.textContent.includes("Anim Beta")).click(); }); await sleep(400);
  ok("changing the selection while off-screen mounts nothing", (await anims()).length === 0 && (await selected()) === "Anim Beta", `${JSON.stringify(await anims())} sel ${await selected()}`);
  await back(); ok("returning plays the NEW selection's animation (Beta), only one mounted, Alpha's is gone", await settled("Anim Beta"), JSON.stringify(await anims()));
  // reduced motion
  await pg.emulateMedia({ reducedMotion: "reduce" }); await sleep(250);
  ok("turning reduced motion on stops the animation immediately", (await anims()).length === 0, JSON.stringify(await anims()));
  await select("Anim Alpha"); await sleep(600); ok("while reduced motion is on, selecting an animated technology plays nothing", (await anims()).length === 0);
  await pg.emulateMedia({ reducedMotion: "no-preference" });
  ok("turning reduced motion off resumes the current selection's animation", await settled("Anim Alpha"), JSON.stringify(await anims()));

  // swipe: pressing on a neighbour and dragging 60px (inside the same button) must not select that neighbour on release
  await select("Anim Alpha"); await pg.mouse.move(5, 5);
  const geo = await pg.evaluate(() => { const ex = [...document.querySelectorAll(".exhibit:not([data-far])")]; const cur = ex.findIndex((e) => e.dataset.on === "true"); const rect = (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * 0.4 }; };
    const sorted = ex.map((e) => ({ e, ...rect(e), name: e.querySelector(".lbl").textContent })).sort((a, b) => a.x - b.x); const ci = sorted.findIndex((s) => s.e.dataset.on === "true");
    return { right: sorted[ci + 1], left: sorted[ci - 1], cur: sorted[ci] ? sorted[ci].name : null }; });
  const nb = geo.right; const prev = geo.left;
  // The browser fires a click when press and release land on the same element. Reproduce exactly that: press on the neighbour, drag 70px (a swipe), release, then the click.
  await pg.evaluate(({ x, y, name }) => { const e = [...document.querySelectorAll(".exhibit")].find((q) => q.querySelector(".lbl").textContent === name); const st = document.querySelector(".stage");
    const ev = (t, cx, el) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, clientX: cx, clientY: y, pointerType: "mouse", isPrimary: true, button: 0 }));
    ev("pointerdown", x, e); ev("pointermove", x + 30, st); ev("pointermove", x + 70, st); ev("pointerup", x + 70, e); e.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1, clientX: x + 70, clientY: y })); /* a real pointer click has detail 1; HTMLElement.click() would be detail 0, like a keyboard press */ }, { x: nb.x, y: nb.y, name: nb.name });
  await sleep(500);
  const after = await selected();
  ok("releasing a swipe on an exhibit does not select it: the swipe moved one step (to the previous exhibit) and nothing more", after === prev.name && after !== nb.name, `now "${after}", expected "${prev.name}", the pressed one was "${nb.name}"`);
  // A long swipe: past the threshold, held for over 500 ms (the old timer expired here), released over an exhibit, then the click the browser fires.
  await select("Anim Alpha"); await pg.mouse.move(5, 5); await sleep(900);
  const g2 = await pg.evaluate(() => { const ex = [...document.querySelectorAll(".exhibit:not([data-far])")].map((e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * 0.4, name: e.querySelector(".lbl").textContent, on: e.dataset.on === "true" }; }).sort((a, b) => a.x - b.x); const ci = ex.findIndex((e) => e.on); return { right: ex[ci + 1], left: ex[ci - 1] }; });
  const startSel = await selected();
  await pg.evaluate(async ({ x, y, name }) => { const e = [...document.querySelectorAll(".exhibit")].find((q) => q.querySelector(".lbl").textContent === name); const st = document.querySelector(".stage");
    const ev = (t, cx, el) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, clientX: cx, clientY: y, pointerType: "mouse", isPrimary: true, button: 0 }));
    ev("pointerdown", x, e); ev("pointermove", x + 30, st); ev("pointermove", x + 70, st); // crosses the 48px threshold: one step
    await new Promise((r) => setTimeout(r, 900)); // hold well past 500 ms
    ev("pointermove", x + 80, st); ev("pointermove", x + 90, st); // still the same gesture: must not step again
    ev("pointerup", x + 70, e); e.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1, clientX: x + 70, clientY: y })); /* a real pointer click has detail 1; HTMLElement.click() would be detail 0, like a keyboard press */ }, { x: g2.right.x, y: g2.right.y, name: g2.right.name });
  await sleep(500);
  const longAfter = await selected();
  ok("a swipe held for over 500 ms moves exactly one step and the release does not select the exhibit under the pointer", longAfter === g2.left.name && longAfter !== g2.right.name && longAfter !== startSel, `start "${startSel}", now "${longAfter}", expected "${g2.left.name}", pressed "${g2.right.name}"`);
  // cancelled gesture: the next click must not be swallowed
  await pg.evaluate(({ x, y, name }) => { const e = [...document.querySelectorAll(".exhibit")].find((q) => q.querySelector(".lbl").textContent === name); const st = document.querySelector(".stage");
    const ev = (t, cx, el) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, clientX: cx, clientY: y, pointerType: "mouse", isPrimary: true, button: 0 }));
    ev("pointerdown", x, e); ev("pointermove", x + 30, st); ev("pointermove", x + 70, st); ev("pointercancel", x + 70, st); }, { x: g2.right.x, y: g2.right.y, name: g2.right.name });
  await sleep(300); await pg.mouse.move(5, 5); await sleep(900);
  const tg2 = await pg.evaluate(() => { const e = [...document.querySelectorAll(".exhibit:not([data-far])")].find((x) => x.dataset.on !== "true"); return e.querySelector(".lbl").textContent; });
  await pg.locator(".exhibit:not([data-far])", { hasText: tg2 }).first().click(); await sleep(400);
  ok("after a cancelled swipe the next click works (nothing is left suppressed)", (await selected()) === tg2, `${await selected()} vs ${tg2}`);
  // keyboard activation is never suppressed
  await pg.evaluate(({ x, y, name }) => { const e = [...document.querySelectorAll(".exhibit")].find((q) => q.querySelector(".lbl").textContent === name); const st = document.querySelector(".stage");
    const ev = (t, cx, el) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, clientX: cx, clientY: y, pointerType: "mouse", isPrimary: true, button: 0 }));
    ev("pointerdown", x, e); ev("pointermove", x + 30, st); ev("pointermove", x + 70, st); }, { x: g2.right.x, y: g2.right.y, name: g2.right.name });
  // gesture never ended (no pointerup); a keyboard Enter on a focused exhibit (click with detail 0) must still work
  await pg.evaluate(() => { const e = [...document.querySelectorAll(".exhibit:not([data-far])")].find((x) => x.dataset.on !== "true"); window.__kb = e.querySelector(".lbl").textContent; e.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 0 })); });
  await sleep(300);
  ok("a keyboard-style click (detail 0) is never swallowed, even mid-gesture", (await selected()) === (await pg.evaluate(() => window.__kb)), `${await selected()}`);
  await pg.evaluate(() => window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })));
  // a plain click still selects
  await pg.mouse.move(5, 5); await sleep(1000);
  const target = await pg.evaluate(() => { const ex = [...document.querySelectorAll(".exhibit:not([data-far])")].filter((e) => e.dataset.on !== "true"); const e = ex[0]; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * 0.4, name: e.querySelector(".lbl").textContent }; });
  await pg.mouse.click(target.x, target.y); await sleep(500);
  ok("a normal click on an exhibit still selects it", (await selected()) === target.name, `${await selected()} vs ${target.name}`);
  ok("no page errors during any of this", errs.length === 0, errs.join(" | "));
  await cx.close();

  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
