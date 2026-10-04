// End-to-end checks of the CMS against the LOCAL stand-in (real RLS). Run after scripts/test/start-app.sh and seed-users.sh.
//   NODE_PATH=$(npm root -g) node scripts/test/admin-e2e.cjs [baseUrl] [screenshotDir]
const { chromium } = require("playwright");
const fs = require("fs");
const BASE = process.argv[2] || "http://localhost:3300";
const SHOTS = process.argv[3] || "/tmp/claude-0/adm";
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log("  PASS " + name); } else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); } };

async function login(ctx, email, password = "correct-horse-battery") {
  const p = await ctx.newPage();
  await p.goto(BASE + "/admin/login", { waitUntil: "load" }); await sleep(400);
  await p.fill("#email", email); await p.fill("#password", password);
  await p.click('button[type="submit"]');
  await sleep(1500);
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

  // ---- signed out
  let ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  let p = await ctx.newPage();
  await p.goto(BASE + "/admin", { waitUntil: "load" }); await sleep(400);
  ok("signed-out /admin redirects to login", /\/admin\/login/.test(p.url()), p.url());
  await p.goto(BASE + "/admin/content/project", { waitUntil: "load" }); await sleep(400);
  ok("signed-out content list redirects to login", /\/admin\/login/.test(p.url()), p.url());
  const r = await p.request.get(BASE + "/api/admin/anything");
  ok("signed-out /api/admin returns 401 JSON", r.status() === 401, String(r.status()));
  const hdr = await (await p.request.get(BASE + "/admin/login")).headers();
  ok("admin responses are noindex and no-store", /noindex/.test(hdr["x-robots-tag"] || "") && /no-store/.test(hdr["cache-control"] || ""), JSON.stringify(hdr["x-robots-tag"]));
  await p.fill("#email", "admin@test.local"); await p.fill("#password", "wrong-password-here"); await p.click('button[type="submit"]'); await sleep(1200);
  ok("wrong password shows a generic error", /Email or password is incorrect/.test(await p.locator("body").innerText()));
  await ctx.close();

  // ---- outsider: valid credentials but no CMS role
  ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  p = await login(ctx, "outsider@test.local");
  ok("account without a role cannot sign in to the CMS", /\/admin\/login/.test(p.url()) && /not been given CMS access/.test(await p.locator("body").innerText()), p.url());
  await p.goto(BASE + "/admin", { waitUntil: "load" }); await sleep(400);
  ok("outsider is still sent to login", /\/admin\/login/.test(p.url()), p.url());
  await ctx.close();

  // ---- editor
  ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  p = await login(ctx, "editor@test.local");
  ok("editor reaches the dashboard", /\/admin\/?$/.test(p.url()) && (await p.locator("h1").first().innerText()) === "Dashboard", p.url());
  await p.screenshot({ path: SHOTS + "/dashboard-empty.png" });
  await p.goto(BASE + "/admin/users", { waitUntil: "load" }); await sleep(400);
  ok("editor cannot open Users and access", !/Users and access/.test(await p.locator("h1").first().innerText().catch(() => "")) , p.url());

  await p.goto(BASE + "/admin/content/project", { waitUntil: "load" }); await sleep(400);
  ok("empty project list shows an empty state", /No projects and case studies here yet/i.test(await p.locator("body").innerText()));
  p.once("dialog", (d) => d.accept());
  await p.getByRole("button", { name: "Import starter content" }).click();
  await p.waitForSelector("table.adm-table", { timeout: 20000 });
  const imported = await p.locator("table.adm-table tbody tr").count();
  ok("import starter content creates the existing projects", imported >= 20, String(imported));

  // create a new project
  await p.goto(BASE + "/admin/content/project/new", { waitUntil: "load" }); await sleep(400);
  await p.fill("#title", "Test Expo 2027");
  ok("slug is suggested from the title", (await p.inputValue("#slug")) === "test-expo-2027");
  await p.getByRole("button", { name: "Create draft" }).click();
  await p.waitForURL(/\/admin\/content\/project\/[0-9a-f-]{36}$/, { timeout: 15000 });
  ok("new draft opens in the editor", (await p.locator("h1").first().innerText()) === "Test Expo 2027");
  const editorUrl = p.url();

  // publish without required summary -> field error
  await p.getByRole("button", { name: /Save and publish/ }).click();
  await sleep(1500);
  ok("publishing without a summary is blocked with a field message", /Summary is required to publish/.test(await p.locator("body").innerText()));
  await p.screenshot({ path: SHOTS + "/editor-validation.png", fullPage: false });

  // fill, save, unsaved-changes indicator
  await p.fill("textarea >> nth=0", "A short, plain summary of the test project.");
  ok("editing shows unsaved changes", /Unsaved changes/.test(await p.locator(".adm-savebar .status").innerText()));
  await p.getByRole("button", { name: "Save draft" }).click(); await sleep(1500);
  ok("saving shows a saved status", /Saved/.test(await p.locator(".adm-savebar .status").innerText()), await p.locator(".adm-savebar .status").innerText());

  // slug collision
  await p.goto(BASE + "/admin/content/project/new", { waitUntil: "load" }); await sleep(400);
  await p.fill("#title", "Another"); await p.fill("#slug", "whx");
  await p.getByRole("button", { name: "Create draft" }).click(); await sleep(1500);
  ok("duplicate slug is refused with a clear message", /already (used|in use)/i.test(await p.locator("body").innerText()), (await p.locator("body").innerText()).slice(0, 200));

  // publish
  await p.goto(editorUrl, { waitUntil: "load" }); await sleep(400);
  await p.getByRole("button", { name: /Save and publish/ }).click(); await sleep(2000);
  ok("a valid draft publishes", /Published\. The public page/.test(await p.locator("body").innerText()));
  await p.screenshot({ path: SHOTS + "/editor-published.png" });
  // ---- redirects: unsafe targets and loops are refused with clear messages
  await p.goto(BASE + "/admin/redirects", { waitUntil: "load" }); await sleep(400);
  const addRedirect = async (from, to) => { await p.fill("#rd-src", from); await p.fill("#rd-tgt", to); await p.getByRole("button", { name: "Add redirect" }).click(); await sleep(1500); return (await p.locator("body").innerText()); };
  let t = await addRedirect("/old-a", "//evil.example/login");
  ok("a protocol-relative //host redirect target is refused", /single \/|Use a path/.test(t) && !/evil\.example/.test(await p.locator("table.adm-table").innerText().catch(() => "")));
  t = await addRedirect("/old-b", "https://allowed.example@evil.example/");
  ok("a userinfo (@) redirect target is refused", /no @|plain https/.test(t));
  t = await addRedirect("/old-c", "https://not-allowed.example/page");
  ok("an external redirect target is refused until its host is allowed in Site settings", /Allowed redirect hosts/.test(t));
  t = await addRedirect("/old-d", "/work");
  ok("an internal redirect is accepted", /\/old-d/.test(await p.locator("table.adm-table").innerText()));
  t = await addRedirect("/work", "/old-d");
  ok("a redirect loop is refused", /loop/i.test(t));
  t = await addRedirect("/admin/x", "/");
  ok("redirects cannot shadow /admin", /cannot be redirected/.test(t));
  await ctx.close();

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
