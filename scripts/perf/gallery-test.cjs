// Behavioural checks for the full-width showroom and team gallery (cursor hover, edge steering, click, keys, mobile, reduced motion).
// NODE_PATH=$(npm root -g) node scripts/perf/gallery-test.cjs http://localhost:3300
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3300";
const out = []; const ok = (n, c, d = "") => out.push((c ? "PASS " : "FAIL ") + n + (d ? " - " + d : ""));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const G = {
  sr: { stage: ".sr-stage", item: ".sr-ex", on: '.sr-ex[data-on="true"]', section: "#technology" },
  tg: { stage: ".tg-stage", item: ".tg-card", on: '.tg-card[data-active="true"]', section: "#people" },
};
(async () => {
  process.on("unhandledRejection", (e) => { ok("unexpected error", false, String(e).split("\n")[0]); console.log(out.join("\n")); process.exit(1); });
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
  const errs = [];
  const open = async (opts) => {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(String(e)));
    await p.route(/youtube|ytimg/, (r) => r.abort());
    await p.goto(BASE + "/", { waitUntil: "load" });
    return p;
  };
  const prep = async (p, g) => {
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 800) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } });
    for (let k = 0; k < 3; k++) { // sections below the fold change height as they render: settle on the stage
      await p.evaluate(([s]) => document.querySelector(s + " " + (s === "#technology" ? ".sr-stage" : ".tg-stage")).scrollIntoView({ block: "center" }), [g.section]);
      await sleep(700);
    }
  };
  const active = (p, g) => p.evaluate((s) => Number(document.querySelector(s)?.dataset.i ?? -1), g.on);
  const box = (p, sel) => p.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }, sel);
  const neighbour = (p, g, side) => p.evaluate(([it, on, side]) => {
    const act = document.querySelector(on); const a = act.getBoundingClientRect(); const cx = a.x + a.width / 2;
    const c = [...document.querySelectorAll(it)].filter((e) => e !== act).map((e) => { const r = e.getBoundingClientRect(); return { i: Number(e.dataset.i), x: r.x + r.width / 2, y: r.y + r.height / 2, vis: getComputedStyle(e).opacity > 0.2 }; })
      .filter((o) => o.vis && o.y > 0 && o.y < innerHeight && (side > 0 ? o.x > cx + 120 : o.x < cx - 120) && o.x > innerWidth * 0.2 && o.x < innerWidth * 0.8).sort((m, n) => Math.abs(m.x - cx) - Math.abs(n.x - cx));
    return c[0];
  }, [g.item, g.on, side]);

  for (const key of ["sr", "tg"]) {
    const g = G[key]; const name = key === "sr" ? "showroom" : "team gallery";
    const p = await open({}); await prep(p, g);
    const st = await box(p, g.stage);
    ok(`${name}: stage spans the viewport`, Math.abs(st.w - 1440) < 2 && Math.abs(st.x) < 2, `w=${st.w} x=${st.x}`);
    ok(`${name}: no horizontal overflow`, (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    ok(`${name}: hint shown for mouse`, await p.locator(g.stage + " ~ .stage-hint, " + g.stage + " + .stage-hint, " + g.section + " .stage-hint").first().isVisible());
    const mid = st.y + st.h * 0.5;
    const start = await active(p, g);
    const nb = await neighbour(p, g, 1);
    ok(`${name}: a visible neighbour exists`, !!nb);
    // 1. pass-through does not select
    await p.mouse.move(720, 60); await p.mouse.move(nb.x - 30, nb.y, { steps: 4 }); await p.mouse.move(nb.x, nb.y, { steps: 3 }); await sleep(120); await p.mouse.move(720, 20, { steps: 3 });
    await sleep(700); ok(`${name}: brief pass does not change selection`, (await active(p, g)) === start);
    // 2. intentional hover selects once
    await p.mouse.move(nb.x - 40, nb.y + 5, { steps: 5 }); await p.mouse.move(nb.x, nb.y, { steps: 3 }); await sleep(150);
    ok(`${name}: not selected before ~300ms`, (await active(p, g)) === start);
    await sleep(500);
    const a1 = await active(p, g); ok(`${name}: hover selects the neighbour`, a1 === nb.i, `${start} -> ${a1}, wanted ${nb.i}`);
    // 3. stationary pointer: no chain
    await sleep(2500); ok(`${name}: stationary pointer does not chain`, (await active(p, g)) === a1);
    // 4. fresh movement over another neighbour works again
    const nb2 = await neighbour(p, g, -1);
    await p.mouse.move(720, st.y + 8, { steps: 6 }); await sleep(900); // settle + fresh, via the empty strip above the items
    await p.mouse.move(nb2.x, st.y + 8, { steps: 8 }); await p.mouse.move(nb2.x, nb2.y, { steps: 6 }); await sleep(900);
    const a2 = await active(p, g); ok(`${name}: fresh movement allows another hover selection`, a2 !== a1, `${a1} -> ${a2}`);
    // 5. steering right
    await p.mouse.move(720, mid, { steps: 5 }); await sleep(600);
    const before = await active(p, g);
    await p.mouse.move(1370, mid, { steps: 8 }); await p.mouse.move(1400, mid, { steps: 3 }); await sleep(3200);
    const steered = await active(p, g); const steerAttr = await p.evaluate((s) => document.querySelector(s).dataset.steer || "", g.stage);
    ok(`${name}: edge zone steers`, steered !== before, `${before} -> ${steered}, steer=${steerAttr}`);
    // 6. return to centre stops
    await p.mouse.move(720, mid, { steps: 10 }); await sleep(500); const s1 = await active(p, g); await sleep(2000);
    ok(`${name}: steering stops in the neutral zone`, (await active(p, g)) === s1 && !(await p.evaluate((s) => document.querySelector(s).dataset.steer, g.stage)));
    // 7. exit stops
    await p.mouse.move(1400, mid, { steps: 8 }); await sleep(700); await p.mouse.move(1400, st.y - 60, { steps: 4 }); await sleep(300); const s2 = await active(p, g); await sleep(2000);
    ok(`${name}: leaving the stage stops steering`, (await active(p, g)) === s2);
    // 8. keyboard
    await p.focus(g.on); const k0 = await active(p, g); await p.keyboard.press("ArrowRight"); await sleep(400);
    ok(`${name}: ArrowRight advances`, (await active(p, g)) !== k0);
    ok(`${name}: focus stays on the centred item`, await p.evaluate((s) => document.activeElement === document.querySelector(s), g.on));
    // 9. arrows
    const lbl = key === "sr" ? '[aria-label="Next exhibit"]' : '[aria-label="Next person"]';
    const n0 = await active(p, g); await p.click(lbl); await sleep(400); ok(`${name}: arrow button works`, (await active(p, g)) !== n0);
    // 10. click side item centres it
    const nb3 = await neighbour(p, g, 1); await p.mouse.move(nb3.x, nb3.y, { steps: 3 }); await p.mouse.down(); await p.mouse.up(); await sleep(500);
    ok(`${name}: clicking a side item centres it`, (await active(p, g)) === nb3.i);
    await p.close();
  }

  // click on centred showroom item opens its details
  { const g = G.sr; const p = await open({}); await prep(p, g);
    const ctr = async (sel) => { const r = await box(p, sel); return [r.x + r.w / 2, r.y + r.h / 2]; };
    const ti = await p.evaluate(() => [...document.querySelectorAll(".sr-ex")].findIndex((e) => e.textContent.includes("Tri-Helix")));
    if (ti >= 0) {
      const click = async (sel) => { const [x, y] = await ctr(sel); await p.mouse.move(x, y, { steps: 4 }); await p.mouse.down(); await p.mouse.up(); };
      const other = await p.evaluate((t) => { const n = document.querySelectorAll(".sr-ex").length; return (t + 1) % n; }, ti);
      await p.keyboard.press("Tab"); // no-op for focus; the next lines move selection away from Tri-Helix by clicking another exhibit first
      if ((await active(p, g)) === ti) { await p.evaluate(() => document.querySelector('[aria-label="Next exhibit"]').click()); await sleep(1200); }
      void other;
      await click(`.sr-ex[data-i="${ti}"]`); await sleep(1500);
      await click('.sr-ex[data-on="true"]');
      await p.waitForURL(/technologies\/tri-helix/, { timeout: 8000 }).then(() => ok("showroom: clicking the centred exhibit opens its details", true), () => ok("showroom: clicking the centred exhibit opens its details", false, p.url()));
    }
    await p.close(); }
  // team: click centred opens profile; filters; no steering over arrows
  { const g = G.tg; const p = await open({}); await prep(p, g);
    { const r = await box(p, ".tg-card[data-active='true']"); await p.mouse.move(r.x + r.w / 2, r.y + r.h / 2, { steps: 4 }); await p.mouse.down(); await p.mouse.up(); await sleep(900); }
    ok("team: clicking the centred card focuses the profile", await p.evaluate(() => document.activeElement?.classList.contains("tg-profile")));
    const a = await active(p, g); const st = await box(p, g.stage); await p.mouse.move(720, st.y + st.h * 0.5, { steps: 4 }); await p.mouse.move(1400, st.y + st.h * 0.5, { steps: 6 }); await sleep(2500);
    ok("team: steering paused while the profile has focus", (await active(p, g)) === a);
    await p.locator(".tg-chips .chip").nth(1).click(); await sleep(300);
    ok("team: department filter still works", (await p.locator(".tg-card").count()) > 0);
    await p.close(); }
  // reduced motion: no steering, hover still selects
  { const g = G.sr; const p = await open({ reducedMotion: "reduce" }); await prep(p, g);
    const st = await box(p, g.stage); const mid = st.y + st.h * 0.5; const s0 = await active(p, g);
    await p.mouse.move(720, st.y + 8, { steps: 4 }); await p.mouse.move(1400, st.y + 8, { steps: 8 }); await sleep(3000);
    const s1 = await active(p, g); ok("reduced motion: no continuous steering", s1 === s0, s0 + " -> " + s1 + " reduced=" + (await p.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)));
    await p.close(); }
  // no pointer-fine: hint hidden and no steering (touch device)
  for (const key of ["sr", "tg"]) {
    const g = G[key]; const p = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); await prep(p, g);
    ok(`mobile ${key}: no horizontal overflow`, (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
    ok(`mobile ${key}: hint hidden on touch`, !(await p.locator(g.section + " .stage-hint").first().isVisible()));
    ok(`mobile ${key}: vertical panning left to the browser`, (await p.evaluate((s) => getComputedStyle(document.querySelector(s)).touchAction, g.stage)).includes("pan-y"));
    const c = await box(p, g.on); ok(`mobile ${key}: centred item is prominent`, c.w > 120 && c.x > 20 && c.x + c.w < 380, JSON.stringify(c));
    const a0 = await active(p, g);
    const next = await neighbour(p, g, 1).catch(() => null);
    await p.locator(key === "sr" ? '[aria-label="Next exhibit"]' : '[aria-label="Next person"]').tap(); await sleep(500);
    ok(`mobile ${key}: next control works`, (await active(p, g)) !== a0);
    // swipe left via pointer events (touch)
    const sb = await box(p, g.stage); const a1 = await active(p, g);
    await p.evaluate(([sel, y]) => { const el = document.querySelector(sel); const mk = (t, x) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerType: "touch", clientX: x, clientY: y, isPrimary: true })); mk("pointerdown", 300); mk("pointermove", 220); mk("pointermove", 150); mk("pointerup", 150); }, [g.stage, sb.y + sb.h / 2]);
    await sleep(500); ok(`mobile ${key}: swipe changes selection`, (await active(p, g)) !== a1);
    void next; await p.close();
  }
  ok("no uncaught page errors", errs.length === 0, errs.slice(0, 2).join(" | "));
  console.log(out.join("\n")); await b.close();
})();
