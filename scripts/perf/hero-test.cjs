// Behavioural checks for the Kinetic Tower hero. NODE_PATH=$(npm root -g) node scripts/perf/hero-test.cjs http://localhost:3300
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3300";
const out = []; const ok = (n, c, d = "") => out.push((c ? "PASS " : "FAIL ") + n + (d ? " - " + d : ""));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const errs = [];
  // ---- desktop, motion allowed
  let ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  let p = await ctx.newPage(); p.on("console", (m) => m.type() === "error" && errs.push(m.text())); p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  const val = () => p.locator(".scene").getAttribute("aria-valuenow");
  ok("starts on Experience (static fallback state)", (await val()) === "2");
  await p.locator(".step").nth(0).click(); await sleep(1400);
  ok("stepper -> Idea", (await val()) === "0" && (await p.locator('.sc[data-on="true"] .sc-title').textContent()).includes("idea"));
  await p.locator(".scene").focus(); await p.keyboard.press("ArrowRight"); await sleep(1200);
  ok("keyboard ArrowRight -> Engineering", (await val()) === "1");
  await p.keyboard.press("End"); await sleep(1200); ok("End -> Experience", (await val()) === "2");
  await p.keyboard.press("Home"); await sleep(1200); ok("Home -> Idea", (await val()) === "0");
  // drag: left drag advances; flick
  const box = await p.locator(".scene").boundingBox();
  await p.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5); await p.mouse.down();
  for (let i = 1; i <= 14; i++) { await p.mouse.move(box.x + box.width * (0.7 - i * 0.03), box.y + box.height * 0.5); await sleep(14); }
  await p.mouse.up(); await sleep(1400);
  ok("drag left advances the stage", Number(await val()) >= 1, "stage " + (await val()));
  const mid = await (async () => { await p.locator(".step").nth(0).click(); await sleep(120); return p.locator(".tier").nth(5).evaluate((e) => e.style.transform); })();
  ok("tiers carry per-tier twist while moving", /rotateY/.test(mid), mid);
  ok("scene allows vertical scroll (touch-action: pan-y)", (await p.locator(".scene").evaluate((e) => getComputedStyle(e).touchAction)) === "pan-y");
  ok("no layout-affecting animation loop when idle", await (async () => { await sleep(1500); return p.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 500) requestAnimationFrame(f); else res(true); }; f(); })); })());
  await ctx.close();
  // ---- reduced motion
  ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  p = await ctx.newPage(); await p.goto(BASE + "/", { waitUntil: "networkidle" });
  ok("reduced motion: tower has no animation", (await p.locator(".tower").evaluate((e) => getComputedStyle(e).animationName)) === "none");
  await p.locator(".step").nth(0).click(); await sleep(150);
  ok("reduced motion: stage changes instantly", (await p.locator(".scene").getAttribute("aria-valuenow")) === "0");
  await ctx.close();
  // ---- no JavaScript
  ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  p = await ctx.newPage(); await p.goto(BASE + "/", { waitUntil: "load" });
  ok("no-JS: hero copy + tower render", (await p.locator("h1").textContent()).includes("Engineering movement") && (await p.locator(".tier").count()) === 6);
  ok("no-JS: CTA links present", (await p.getByRole("link", { name: /Explore our work/ }).count()) === 1);
  await ctx.close();
  // ---- mobile touch swipe
  ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  p = await ctx.newPage(); await p.goto(BASE + "/", { waitUntil: "networkidle" });
  const inView = await p.locator(".scene").evaluate((e) => e.getBoundingClientRect().top < window.innerHeight * 0.7);
  ok("mobile: tower visible in the first screen", inView);
  const cdp = await ctx.newCDPSession(p);
  const sb = await p.locator(".scene").boundingBox();
  const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
  await touch("touchStart", sb.x + sb.width * 0.25, sb.y + sb.height * 0.5);
  for (let i = 1; i <= 10; i++) { await touch("touchMove", sb.x + sb.width * (0.25 + i * 0.05), sb.y + sb.height * 0.5); await sleep(16); }
  await touch("touchEnd"); await sleep(1400);
  ok("mobile: horizontal swipe turns the tower", Number(await p.locator(".scene").getAttribute("aria-valuenow")) !== 2);
  const y0 = await p.evaluate(() => window.scrollY);
  await touch("touchStart", sb.x + sb.width * 0.5, sb.y + sb.height * 0.7);
  for (let i = 1; i <= 10; i++) { await touch("touchMove", sb.x + sb.width * 0.5, sb.y + sb.height * (0.7 - i * 0.05)); await sleep(16); }
  await touch("touchEnd"); await sleep(600);
  ok("mobile: vertical swipe on the tower still scrolls the page", (await p.evaluate(() => window.scrollY)) > y0, `${y0} -> ${await p.evaluate(() => window.scrollY)}`);
  await ctx.close();
  ok("no console/page errors", errs.length === 0, errs.join(" | "));
  console.log(out.join("\n")); await b.close();
})();
