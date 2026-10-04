// Enquiry workflow end to end: validation, storage-before-success, idempotency, spam controls, rate limiting,
// private attachments, notification failure + retry, and the admin inbox. LOCAL stand-ins only; no real email is sent.
const { chromium } = require("playwright");
const sharp = require("sharp");
const crypto = require("crypto");
const BASE = process.argv[2] || "http://localhost:3300";
const MOCK = "http://127.0.0.1:54321";
const MAIL = "http://127.0.0.1:54399";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log("  PASS " + name); } else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); } };
const sql = (q) => require("child_process").execFileSync("psql", ["-h", "/var/tmp/pgtest", "-p", "54329", "-U", "postgres", "-d", "enginious_test", "-At", "-c", q]).toString().trim();
const post = (path, body, headers = {}) => fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
const good = () => ({ submissionId: crypto.randomUUID(), region: "ksa", name: "Test Visitor", email: "visitor@client.test", company: "Client Co", country: "Saudi Arabia", projectType: "event", eventDate: "", budget: "50-150k", message: "We would like an interactive floor for our stand.", technologies: ["tri-helix"], website: "", sourcePath: "/contact" });

(async () => {
  await fetch(MAIL + "/__fail?on=0", { method: "POST" }); await fetch(MAIL + "/__sent", { method: "DELETE" });
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

  // ---- API: validation, storage, idempotency, honeypot
  let r = await post("/api/enquiries", { ...good(), email: "nope", message: "hi" });
  let j = await r.json();
  ok("invalid input is rejected with per-field messages (400)", r.status === 400 && j.errors.email && j.errors.message);
  ok("nothing is stored for an invalid enquiry", sql("select count(*) from enquiries") === "0");
  const body = good();
  r = await post("/api/enquiries", body); j = await r.json();
  ok("a valid enquiry is stored and acknowledged with a reference (201)", r.status === 201 && /^ENQ-[A-Z0-9]{8}$/.test(j.reference), JSON.stringify(j));
  ok("the row exists with the selected region and technology shortlist", sql(`select region || '|' || technologies::text from enquiries where reference = '${j.reference}'`) === "ksa|{tri-helix}");
  r = await post("/api/enquiries", body); const j2 = await r.json();
  ok("a repeat of the same submission returns the original reference (idempotent)", j2.reference === j.reference && sql("select count(*) from enquiries") === "1");
  r = await post("/api/enquiries", { ...good(), website: "http://spam.example" }); j = await r.json();
  ok("honeypot submissions get an inert success and store nothing", r.ok && j.reference === "ENQ-00000000" && sql("select count(*) from enquiries") === "1");
  r = await fetch(BASE + "/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.example" }, body: JSON.stringify(good()) });
  ok("cross-site posts are refused", r.status === 403);
  r = await fetch(BASE + "/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...good(), message: "x".repeat(30000) }) });
  ok("oversized bodies are refused (413)", r.status === 413);
  ok("anonymous users cannot read enquiries through the database API", await (async () => { const keys = await (await fetch(MOCK + "/__mock/keys")).json(); const x = await fetch(MOCK + "/rest/v1/enquiries?select=*", { headers: { apikey: keys.anon, Authorization: `Bearer ${keys.anon}` } }); return x.status === 401 || x.status === 403; })());

  // ---- notification: first attempt used the working stand-in; the email goes to the authorised test address only
  await sleep(1500);
  const sent = await (await fetch(MAIL + "/__sent")).json();
  ok("staff notification sent, redirected to the authorised test recipient with [TEST]", sent.length >= 1 && sent[0].to.length === 1 && sent[0].to[0] === "authorised-test@example.test" && /^\[TEST\]/.test(sent[0].subject), JSON.stringify(sent[0] && { to: sent[0].to, s: sent[0].subject }));
  ok("the visitor is never emailed", sent.every((m) => !m.to.includes("visitor@client.test")));
  ok("notification status is recorded as sent", sql("select notification_status from enquiries order by created_at limit 1") === "sent");

  // ---- notification failure must not lose the enquiry
  await fetch(MAIL + "/__fail?on=1", { method: "POST" });
  const failBody = good(); r = await post("/api/enquiries", failBody); j = await r.json();
  ok("when the email provider is down the enquiry is STILL stored and confirmed", r.status === 201 && !!j.reference);
  await sleep(1800);
  ok("the failed notification is recorded (not silently lost)", sql(`select notification_status || '|' || (notification_attempts >= 1)::text from enquiries where reference = '${j.reference}'`) === "failed|true");
  ok("the stored error is generic (no provider internals or addresses)", !/@/.test(sql(`select coalesce(notification_error,'') from enquiries where reference = '${j.reference}'`)));
  const failedRef = j.reference;

  // ---- rate limiting (persistent)
  await fetch(MAIL + "/__fail?on=0", { method: "POST" });
  const email = "ratelimit@client.test"; let last = 0, limited = 0;
  for (let i = 0; i < 9; i++) { r = await post("/api/enquiries", { ...good(), email }); last = r.status; if (r.status === 429) { limited++; const ra = r.headers.get("retry-after"); if (!ra) ok("429 carries Retry-After", false); } }
  ok("repeated enquiries from one address are rate limited (429)", limited >= 1 && last === 429, `limited=${limited} last=${last}`);
  ok("the rate-limit counters live in the database (persistent), not in memory", Number(sql("select count(*) from rate_limits")) >= 1);
  ok("counters store hashes, never raw emails or IPs", !/ratelimit@|127\.0\.0\.1|::1/.test(sql("select string_agg(key, ',') from rate_limits")));

  // ---- private attachments
  await sql("delete from rate_limits");
  const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#27cdd8" } }).png().toBuffer();
  const att = good(); r = await post("/api/enquiries", att); j = await r.json(); const ref = j.reference;
  const form = (files, over = {}) => { const f = new FormData(); f.set("reference", over.reference || ref); f.set("submissionId", over.submissionId || att.submissionId); files.forEach(([name, buf, type]) => f.append("files", new Blob([buf], { type }), name)); return f; };
  r = await fetch(BASE + "/api/enquiries/attachments", { method: "POST", body: form([["brief.png", png, "image/png"], ["evil.svg", Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"), "image/svg+xml"], ["notes.jpg", Buffer.from("MZ not an image at all"), "image/jpeg"]]) });
  j = await r.json();
  ok("a valid image is attached; SVG and disguised files are refused", j.stored === 1 && j.results.find((x) => x.name === "brief.png").ok && !j.results.find((x) => x.name === "evil.svg").ok && !j.results.find((x) => x.name === "notes.jpg").ok, JSON.stringify(j));
  r = await fetch(BASE + "/api/enquiries/attachments", { method: "POST", body: form([["a.png", png, "image/png"]], { submissionId: crypto.randomUUID() }) });
  ok("attachments need the secret submission id (wrong id = 404)", r.status === 404);
  r = await fetch(BASE + "/api/enquiries/attachments", { method: "POST", body: form([["big.png", Buffer.concat([png, Buffer.alloc(4.5 * 1024 * 1024)]), "image/png"]]) });
  ok("attachments over the size limit are refused", r.status === 413 || r.status === 400, String(r.status));
  const path = sql(`select storage_path from enquiry_attachments limit 1`);
  const pubTry = await fetch(`${MOCK}/storage/v1/object/public/enquiry-attachments/${path}`);
  ok("an attachment is NOT reachable through a public URL (private bucket)", pubTry.status === 404 || pubTry.status === 400);
  ok("the attachment count is recorded on the enquiry", sql(`select attachment_count from enquiries where reference = '${ref}'`) === "1");

  // ---- the contact form in a browser: accessible errors, preserved input, success only after storage
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + "/contact", { waitUntil: "load" }); await sleep(600);
  await p.fill("#name", "Browser Visitor"); await p.fill("#email", "not-an-email"); await p.fill("#message", "short");
  await p.getByRole("button", { name: /Send enquiry/ }).click(); await sleep(1200);
  ok("invalid fields are marked aria-invalid with associated messages", (await p.locator('#email[aria-invalid="true"]').count()) === 1 && (await p.locator("#e-email").count()) === 1);
  ok("input is preserved after a failed submission", (await p.inputValue("#name")) === "Browser Visitor");
  ok("focus moves to the first invalid field", await p.evaluate(() => document.activeElement && document.activeElement.getAttribute("aria-invalid") === "true"));
  await p.fill("#email", "browser@client.test"); await p.fill("#message", "We need a permanent installation in Dubai.");
  const files = p.locator("#files"); await files.setInputFiles({ name: "brief.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%test\n") });
  await p.getByRole("button", { name: /Send enquiry/ }).click();
  await p.waitForSelector("text=Thank you. We have your enquiry.", { timeout: 15000 });
  ok("success is shown only after the enquiry is stored", sql("select count(*) from enquiries where email = 'browser@client.test'") === "1");
  ok("the optional PDF was attached and acknowledged", /1 file attached and stored privately/.test(await p.locator("body").innerText()));
  await p.screenshot({ path: "/tmp/claude-0/adm/contact-success.png" });
  // unavailable backend: the browser keeps the form
  await p.route("**/api/enquiries", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"unavailable"}' }));
  await p.getByRole("button", { name: "Send another enquiry" }).click();
  await p.fill("#name", "Offline Visitor"); await p.fill("#email", "offline@client.test"); await p.fill("#message", "Trying while the server is down.");
  await p.getByRole("button", { name: /Send enquiry/ }).click(); await sleep(1200);
  ok("when the server is unavailable the visitor sees an honest error and keeps their text", /could not send your enquiry/i.test(await p.locator("body").innerText()) && (await p.inputValue("#message")).includes("server is down"));
  ok("no success message is shown for an unstored enquiry", !/Thank you\. We have your enquiry/.test(await p.locator("body").innerText()));

  // ---- admin inbox
  const actx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const a = await actx.newPage();
  await a.goto(BASE + "/admin/login", { waitUntil: "load" }); await a.fill("#email", "editor@test.local"); await a.fill("#password", "correct-horse-battery"); await a.click('button[type="submit"]'); await a.waitForURL(/\/admin\/?$/);
  await a.goto(BASE + "/admin/enquiries", { waitUntil: "load" });
  ok("the inbox lists enquiries with status and region", (await a.locator("table.adm-table tbody tr").count()) >= 3 && /New/.test(await a.locator(".adm-tabs").innerText()));
  await a.goto(BASE + "/admin/enquiries?q=browser%40client.test", { waitUntil: "load" });
  ok("search finds an enquiry by email", (await a.locator("table.adm-table tbody tr").count()) === 1);
  await a.locator("table.adm-table a.t").first().click(); await a.waitForSelector("h1");
  await a.screenshot({ path: "/tmp/claude-0/adm/enquiry-detail.png", fullPage: true });
  ok("the detail view shows the message and the private attachment", /permanent installation in Dubai/.test(await a.locator("body").innerText()) && /brief\.pdf/.test(await a.locator("body").innerText()));
  await a.getByRole("button", { name: "In progress" }).click(); await sleep(1200);
  ok("status can be changed", sql("select status from enquiries where email = 'browser@client.test'") === "in_progress");
  await a.locator("#note").fill("Called the client; they want a quote."); await a.getByRole("button", { name: "Add note" }).click(); await sleep(1500);
  ok("an internal note is saved with its author", /Called the client/.test(await a.locator("body").innerText()) && /editor@test\.local/.test(await a.locator("body").innerText()));
  ok("notes are not exposed anywhere public", (await (await fetch(BASE + "/contact")).text()).indexOf("Called the client") === -1);
  const [popup] = await Promise.all([ctx.waitForEvent("page", { timeout: 10000 }).catch(() => null), a.getByRole("button", { name: /Open \(link expires/ }).click()]);
  void popup;
  await sleep(500);

  // ---- retry safely
  await a.goto(BASE + "/admin/enquiries?status=new", { waitUntil: "load" });
  await a.goto(`${BASE}/admin/enquiries?q=${encodeURIComponent(failBody.email)}`, { waitUntil: "load" });
  const rows = await a.locator("table.adm-table tbody tr").count();
  const target = a.locator("table.adm-table tbody tr", { hasText: failedRef });
  ok("the inbox shows the failed notification state", rows >= 1 && (await target.count()) >= 1 && /failed/.test(await target.first().innerText()));
  await target.first().locator("a.t").click(); await a.waitForSelector("h1");
  await a.getByRole("button", { name: "Retry notification" }).click(); await sleep(2000);
  ok("retrying with the provider back up marks it sent", sql(`select notification_status from enquiries where reference = '${failedRef}'`) === "sent");
  await a.screenshot({ path: "/tmp/claude-0/adm/enquiry-retry.png" });

  // ---- an editor cannot delete; deletion and retention are administrator-only
  ok("an editor does not see the delete control", (await a.getByRole("button", { name: "Delete enquiry" }).count()) === 0);

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
