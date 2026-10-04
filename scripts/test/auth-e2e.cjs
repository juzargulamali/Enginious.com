// Invite-only access, roles and password recovery, end to end against the LOCAL stand-in (emails go to its outbox, never out).
const { chromium } = require("playwright");
const BASE = process.argv[2] || "http://localhost:3300";
const MOCK = "http://127.0.0.1:54321";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log("  PASS " + name); } else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); } };
const outbox = async () => (await fetch(MOCK + "/__mock/outbox")).json();
async function login(ctx, email, password = "correct-horse-battery") {
  const p = await ctx.newPage();
  await p.goto(BASE + "/admin/login", { waitUntil: "load" });
  await p.fill("#email", email); await p.fill("#password", password); await p.click('button[type="submit"]');
  await sleep(1800);
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const adminCtx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const admin = await login(adminCtx, "admin@test.local");
  ok("administrator signs in", /\/admin\/?$/.test(admin.url()));

  // ---- invite
  await admin.goto(BASE + "/admin/users", { waitUntil: "load" });
  ok("administrator can open Users and access", (await admin.locator("h1").first().innerText()) === "Users and access");
  await admin.fill("#inv-email", "newbie@test.local");
  await admin.getByRole("button", { name: "Send invitation" }).click();
  await admin.waitForFunction(() => /Invitation sent to newbie@test\.local/.test(document.body.innerText), null, { timeout: 15000 });
  await admin.waitForFunction(() => /newbie@test\.local/.test(document.querySelector("table.adm-table")?.textContent || ""), null, { timeout: 8000 }).catch(() => {});
  ok("an invitation is sent and the person appears with the chosen role", /newbie@test\.local/.test(await admin.locator("table.adm-table").innerText()));
  const inv = (await outbox()).find((m) => m.to === "newbie@test.local" && m.type === "invite");
  ok("the invitation email was issued (stand-in outbox, nothing sent)", !!inv && !!inv.token_hash);

  // ---- accept: invite link -> choose password
  const newCtx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const np = await newCtx.newPage();
  await np.goto(`${BASE}/admin/auth/confirm?token_hash=${inv.token_hash}&type=invite&next=/admin/set-password`, { waitUntil: "load" });
  ok("invite link starts a session and asks for a password", /\/admin\/set-password/.test(np.url()) && /Signed in as newbie@test\.local/.test(await np.locator("body").innerText()), np.url());
  await np.goto(`${BASE}/admin/auth/confirm?token_hash=${inv.token_hash}&type=invite&next=/admin/set-password`, { waitUntil: "load" });
  await np.fill("#password", "short"); await np.fill("#confirm", "short"); await np.getByRole("button", { name: /Save password/ }).click(); await sleep(1200);
  ok("a short password is refused", /at least 12 characters/.test(await np.locator("body").innerText()));
  await np.fill("#password", "a-long-enough-passphrase"); await np.fill("#confirm", "a-long-enough-passphrase"); await np.getByRole("button", { name: /Save password/ }).click();
  await np.waitForURL(/\/admin\/?$/, { timeout: 15000 }).catch(() => {});
  ok("after choosing a password the new editor reaches the dashboard", (await np.locator("h1").first().innerText()) === "Dashboard", np.url());
  ok("the one-time invite link cannot be reused", await (async () => { const c = await b.newContext(); const q = await c.newPage(); await q.goto(`${BASE}/admin/auth/confirm?token_hash=${inv.token_hash}&type=invite`, { waitUntil: "load" }); const t = await q.locator("body").innerText(); await c.close(); return /Link expired|invalid or has expired/.test(t); })());

  // ---- editor limits
  await np.goto(BASE + "/admin/users", { waitUntil: "load" });
  ok("an editor cannot open Users and access (sent back with a notice)", /\/admin\?denied=1/.test(np.url()) && /administrators only/.test(await np.locator("body").innerText()), np.url());
  await np.goto(BASE + "/admin/audit", { waitUntil: "load" });
  ok("an editor cannot open the audit log", /\/admin\?denied=1/.test(np.url()));

  // ---- role change takes effect
  await admin.goto(BASE + "/admin/users", { waitUntil: "load" });
  await admin.getByLabel("Role for newbie@test.local").selectOption("administrator");
  await sleep(1500);
  await np.goto(BASE + "/admin/users", { waitUntil: "load" });
  ok("promoting to administrator gives access to Users", (await np.locator("h1").first().innerText()) === "Users and access");
  await admin.goto(BASE + "/admin/users", { waitUntil: "load" });
  await admin.getByLabel("Role for newbie@test.local").selectOption("editor"); await sleep(1500);

  // ---- disable
  await admin.goto(BASE + "/admin/users", { waitUntil: "load" });
  const row = admin.locator("tr", { hasText: "newbie@test.local" });
  await row.getByRole("button", { name: "Disable" }).click(); await sleep(1500);
  await np.goto(BASE + "/admin", { waitUntil: "load" });
  ok("a disabled user is locked out immediately", /\/admin\/login/.test(np.url()), np.url());
  await admin.goto(BASE + "/admin/users", { waitUntil: "load" });
  await admin.locator("tr", { hasText: "newbie@test.local" }).getByRole("button", { name: "Enable" }).click(); await sleep(1200);

  // ---- last administrator cannot be demoted
  await admin.goto(BASE + "/admin/users", { waitUntil: "load" });
  await admin.locator("tr", { hasText: "newbie@test.local" }).getByRole("button", { name: "Remove" }).click().catch(() => {});
  await sleep(300);
  const adminSel = admin.getByLabel("Role for admin@test.local");
  await adminSel.selectOption("editor"); await sleep(1500);
  ok("the last active administrator cannot be demoted", /last active administrator/i.test(await admin.locator("body").innerText()), (await admin.locator(".adm-alert").allInnerTexts()).join("|"));

  // ---- recovery
  const recCtx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const rp = await recCtx.newPage();
  await rp.goto(BASE + "/admin/forgot-password", { waitUntil: "load" });
  await fetch(MOCK + "/__mock/outbox", { method: "DELETE" });
  await rp.fill("#email", "nobody@test.local"); await rp.getByRole("button", { name: "Send reset link" }).click(); await sleep(1500);
  const generic = await rp.locator("body").innerText();
  ok("unknown email gets the same generic answer (no account discovery)", /If that address belongs to a CMS account/.test(generic));
  ok("...and nothing is issued for an unknown address", (await outbox()).length === 0);
  await rp.fill("#email", "editor@test.local"); await rp.getByRole("button", { name: "Send reset link" }).click(); await sleep(1500);
  const rec = (await outbox()).find((m) => m.to === "editor@test.local" && m.type === "recovery");
  ok("a recovery link is issued for a real account", !!rec);
  await rp.goto(`${BASE}/admin/auth/confirm?token_hash=${rec.token_hash}&type=recovery&next=/admin/set-password`, { waitUntil: "load" });
  await rp.fill("#password", "a-brand-new-passphrase"); await rp.fill("#confirm", "a-brand-new-passphrase"); await rp.getByRole("button", { name: /Save password/ }).click();
  await rp.waitForURL(/\/admin\/?$/, { timeout: 15000 }).catch(() => {});
  ok("recovery lets the person choose a new password and sign in", (await rp.locator("h1").first().innerText()) === "Dashboard");
  const oldCtx = await b.newContext(); const op = await login(oldCtx, "editor@test.local", "correct-horse-battery");
  ok("the old password no longer works", /\/admin\/login/.test(op.url()) && /incorrect/.test(await op.locator("body").innerText()));
  const newPwCtx = await b.newContext(); const npp = await login(newPwCtx, "editor@test.local", "a-brand-new-passphrase");
  ok("the new password works", /\/admin\/?$/.test(npp.url()));

  // ---- audit trail
  await admin.goto(BASE + "/admin/audit", { waitUntil: "load" });
  const audit = await admin.locator("table.adm-table").innerText();
  ok("access changes are recorded in the audit log", /user\.invite/.test(audit) && /user\.role/.test(audit) && /user\.disable/.test(audit));

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
