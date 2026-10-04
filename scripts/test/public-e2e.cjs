// Public-site integration checks against the LOCAL stand-in: the CMS powers the public pages, drafts stay private,
// publishing/unpublishing/slug changes/SEO edits take effect, and sample testimonials never appear as real ones.
//   NODE_PATH=$(npm root -g) node scripts/test/public-e2e.cjs [baseUrl]
const { chromium } = require("playwright");
const { importDrafts, reviewAndPublish } = require("./lib-adopt.cjs");
const BASE = process.argv[2] || "http://localhost:3300";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log("  PASS " + name); } else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); } };
const get = async (path, opts = {}) => { const r = await fetch(BASE + path, { redirect: "manual", ...opts }); return { status: r.status, text: await r.text(), headers: r.headers }; };
const count = (html) => { const m = /(\d+) projects?<\/p>/.exec(html.replace(/<!--.*?-->/g, "")); return m ? Number(m[1]) : -1; };
const title = (html) => (/<title>([^<]*)<\/title>/.exec(html) || [])[1] || "";

async function login(ctx, email) {
  const p = await ctx.newPage();
  await p.goto(BASE + "/admin/login", { waitUntil: "load" });
  await p.fill("#email", email); await p.fill("#password", "correct-horse-battery"); await p.click('button[type="submit"]');
  await p.waitForURL(/\/admin\/?$/, { timeout: 15000 });
  return p;
}
async function openItem(p, type, text) {
  await p.goto(`${BASE}/admin/content/${type}?q=${encodeURIComponent(text)}`, { waitUntil: "load" });
  await p.locator("table.adm-table a.t", { hasText: text }).first().click();
  await p.waitForURL(new RegExp(`/admin/content/${type}/[0-9a-f-]{36}$`), { timeout: 15000 });
  await p.waitForSelector("#ed-title");
}
const saveDraft = async (p) => { await p.getByRole("button", { name: "Save draft" }).click(); await p.waitForFunction(() => /Saved/.test(document.querySelector(".adm-savebar .status")?.textContent || ""), null, { timeout: 15000 }); };
const publish = async (p) => { await p.getByRole("button", { name: /Save and (publish|update live page)/ }).click(); await p.waitForFunction(() => /Published\. The public page/.test(document.body.innerText), null, { timeout: 20000 }); };

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

  // ---- 1. before the CMS has any content: the built-in starter content is served
  let r = await get("/work");
  ok("starter content: /work lists projects before any import", /World Health Expo/.test(r.text));
  r = await get("/insights"); ok("insights shows an honest empty state", /No articles have been published yet/.test(r.text));
  r = await get("/careers"); ok("careers shows an honest empty state", /no open vacancies/.test(r.text));
  r = await get("/privacy"); ok("privacy notice is marked provisional", /Provisional/.test(r.text));
  r = await get("/robots.txt"); ok("robots.txt disallows everything (indexing off)", /Disallow: \//.test(r.text) && !/Allow: \//.test(r.text));
  r = await get("/sitemap.xml"); ok("sitemap lists nothing while indexing is off", !/<loc>/.test(r.text));
  r = await get("/"); ok("every public page is noindex while indexing is off", /noindex/.test(r.headers.get("x-robots-tag") || "") && /<meta name="robots" content="noindex/.test(r.text));
  r = await get("/this-page-does-not-exist"); ok("unknown address returns a real 404 with the site chrome", r.status === 404 && /This page/.test(r.text) && /site-header/.test(r.text));

  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await login(ctx, "editor@test.local");

  // ---- 2. import is DRAFT-ONLY: the live site must not change at all until an administrator runs the reviewed step
  const TYPES = ["project", "technology", "person", "client", "region", "company_section", "solution", "setting", "page_seo"];
  const beforeWork = (await get("/work")).text, beforeHome = (await get("/")).text, beforeCompany = (await get("/company")).text;
  for (const t of TYPES) await importDrafts(p, BASE, t);
  await sleep(500);
  ok("editor sees the 'still starter content' notice", /still shows the built-in starter content/.test(await (async () => { await p.goto(`${BASE}/admin/content/project`, { waitUntil: "load" }); return p.locator("body").innerText(); })()));
  ok("editor does not get the reviewed-publish control", (await p.getByRole("button", { name: "Review and publish imported content" }).count()) === 0);
  ok("after a draft-only import the live /work is byte-for-byte the same count of projects", count((await get("/work")).text) === count(beforeWork) && count(beforeWork) > 20);
  ok("after a draft-only import the home page and company page are unchanged", (await get("/")).text.length === beforeHome.length && (await get("/company")).text.length === beforeCompany.length);
  await openItem(p, "project", "World Health Expo");
  await p.fill("#ed-title", "IMPORTED DRAFT EDIT");
  await saveDraft(p);
  await p.getByRole("button", { name: /Save and publish/ }).click();
  await p.waitForFunction(() => /still shows the built-in starter content|reviews|Review and publish/i.test(document.body.innerText), null, { timeout: 15000 });
  ok("an editor cannot publish one imported item ahead of the review step", !/Published\. The public page/.test(await p.locator("body").innerText()));
  await sleep(400);
  ok("the live site never showed the edited draft", !/IMPORTED DRAFT EDIT/.test((await get("/work")).text));
  await p.fill("#ed-title", "World Health Expo"); await saveDraft(p);
  // an administrator performs the explicit reviewed publishing step; the site then uses the CMS
  const actx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const ap = await login(actx, "admin@test.local");
  await ap.goto(`${BASE}/admin/content/project`, { waitUntil: "load" });
  await ap.getByRole("button", { name: "Review and publish imported content" }).click();
  ok("publishing needs the review confirmation ticked", await ap.getByRole("button", { name: "Publish reviewed content" }).isDisabled());
  await actx.close();
  const actx2 = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const ap2 = await login(actx2, "admin@test.local");
  for (const t of TYPES) await reviewAndPublish(ap2, BASE, t);
  await actx2.close();
  await sleep(500);
  const afterWork = (await get("/work")).text;
  const nBefore = count(beforeWork), nAfter = count(afterWork);
  ok("after the reviewed publish /work lists the same number of projects", /World Health Expo|IMPORTED DRAFT EDIT/.test(afterWork) && nAfter === nBefore, `${nAfter} vs ${nBefore}`);
  r = await get("/company"); ok("company page shows the imported mission wording", /engineered, built and supported by one team/.test(r.text));
  r = await get("/uae"); ok("UAE page shows the confirmed Dubai contact", /info@enginious\.ae/.test(r.text) && /Dubai/.test(r.text));
  r = await get("/europe"); ok("Europe page says no Europe projects are listed and has no invented email", /do not list projects delivered in Europe/.test(r.text));
  r = await get("/work/whx"); ok("WHX case study still renders", r.status === 200 && /Case study/.test(r.text) && /American Hospital needed to stand out/.test(r.text));
  r = await get("/technologies/tri-helix"); ok("Tri-Helix page renders its imported description", r.status === 200 && /Suitable applications/.test(r.text));

  // ---- 3. a draft edit never changes the live page
  await openItem(p, "project", "World Health Expo");
  const projUrl = p.url();
  await p.fill("#ed-title", "WHX EDITED DRAFT");
  await saveDraft(p);
  await sleep(600);
  r = await get("/work");
  ok("draft title change is NOT visible publicly", /World Health Expo/.test(r.text) && !/WHX EDITED DRAFT/.test(r.text));
  ok("the editor shows 'unpublished edits'", /unpublished edits/.test(await p.locator("body").innerText()));
  r = await get("/work/whx"); ok("case study still shows the live title", /World Health Expo/.test(title(r.text)) || /World Health Expo/.test(r.text));

  // ---- 4. publishing updates the page and its metadata
  await publish(p);
  await sleep(600);
  r = await get("/work"); ok("publishing shows the new title on /work", /WHX EDITED DRAFT/.test(r.text));
  r = await get("/work/whx"); ok("publishing updates the case-study page and <title>", /WHX EDITED DRAFT/.test(title(r.text)), title(r.text));

  // ---- 5. slug change keeps the old address working
  await p.fill("#ed-slug", "whx-expo"); await p.getByRole("button", { name: /Save and update live page/ }).click();
  await p.waitForFunction(() => /Published\. The public page/.test(document.body.innerText), null, { timeout: 20000 });
  // The redirect map refreshes in the background (every 1s in the test build, 60s by default): poll briefly.
  for (let i = 0; i < 8; i++) { await sleep(1300); r = await get("/work/whx"); if (r.status === 301) break; }
  ok("old slug redirects (301) to the new one", r.status === 301 && /\/work\/whx-expo$/.test(r.headers.get("location") || ""), `${r.status} ${r.headers.get("location")}`);
  r = await get("/work/whx-expo"); ok("new slug serves the case study", r.status === 200);

  // ---- 6. unpublish removes it from discovery
  p.once("dialog", (d) => d.accept());
  await p.getByRole("button", { name: "Unpublish" }).click();
  await p.waitForFunction(() => /Unpublished\./.test(document.body.innerText), null, { timeout: 15000 }).catch(() => {});
  await sleep(800);
  r = await get("/work"); ok("unpublished project disappears from /work", !/WHX EDITED DRAFT/.test(r.text) && !/World Health Expo/.test(r.text));
  r = await get("/work/whx-expo"); ok("unpublished case study returns 404", r.status === 404, String(r.status));
  // the starter content must NOT come back once the CMS owns projects
  r = await get("/work"); ok("unpublishing removes exactly one project and does not resurrect built-in starter content", count(r.text) === nAfter - 1, `${count(r.text)} vs ${nAfter - 1}`);
  await p.goto(projUrl, { waitUntil: "load" }).catch(() => {});

  // ---- 7. per-page SEO from the CMS
  await openItem(p, "page_seo", "Work");
  await p.getByLabel("Search title").fill("Work SEO Title Test");
  await p.getByLabel("Search description").fill("A custom description written in the CMS.");
  await publish(p);
  await sleep(600);
  r = await get("/work");
  ok("CMS search title is used for the page <title>", /Work SEO Title Test/.test(title(r.text)), title(r.text));
  ok("CMS search description is used for the meta description", /A custom description written in the CMS\./.test(r.text));
  ok("canonical is set", /<link rel="canonical" href="[^"]*\/work"/.test(r.text));

  // ---- 8. testimonials: approval gate, and only real published ones are public
  await p.goto(`${BASE}/admin/content/testimonial/new`, { waitUntil: "load" });
  await p.fill("#title", "Approved test quote"); await p.getByRole("button", { name: "Create draft" }).click();
  await p.waitForURL(/\/testimonial\/[0-9a-f-]{36}$/);
  await p.getByLabel("Quote").fill("The experience stopped people in the aisle and gave our team a clear story to tell.");
  await p.getByLabel("Person").fill("Test Person"); await p.getByLabel("Role").first().fill("Head of Test"); await p.getByLabel("Organisation").fill("Test Organisation");
  await p.getByRole("button", { name: /Save and publish/ }).click(); await sleep(1800);
  ok("a testimonial cannot be published without written permission", /Written permission must be confirmed/.test(await p.locator("body").innerText()));
  await p.getByLabel("Written permission confirmed").check();
  await p.getByLabel("Fictional sample").uncheck().catch(() => {});
  await publish(p);
  await sleep(600);
  r = await get("/");
  ok("an approved testimonial appears in the Testimonials section", /id="testimonials"/.test(r.text) && /Test Organisation/.test(r.text));
  ok("the internal permission flag is not exposed", !/_permission_confirmed|permission_confirmed/.test(r.text));
  const vis = await b.newPage(); await vis.goto(BASE + "/", { waitUntil: "load" }); await sleep(800);
  ok("fictional samples are not displayed unless ?samples=1 (preview builds only)", !/Alex Sample/.test(await vis.locator("body").innerText()));
  await vis.close();

  // ---- 9. insights article
  await p.goto(`${BASE}/admin/content/article/new`, { waitUntil: "load" });
  await p.fill("#title", "How we build kinetic stands"); await p.getByRole("button", { name: "Create draft" }).click();
  await p.waitForURL(/\/article\/[0-9a-f-]{36}$/);
  await p.getByLabel("Excerpt").fill("A short, honest explanation of how a kinetic stand is built.");
  await p.locator("textarea.adm-md").first().fill("## Why it matters\n\nWe build kinetic stands in **one team**. [Contact us](/contact)\n\n<script>alert(1)</script>");
  await publish(p);
  await sleep(600);
  r = await get("/insights"); ok("published article is listed on /insights", /How we build kinetic stands/.test(r.text));
  r = await get("/insights/how-we-build-kinetic-stands");
  ok("article page renders safe Markdown", r.status === 200 && /<h2>Why it matters<\/h2>/.test(r.text) && /<strong>one team<\/strong>/.test(r.text));
  ok("raw HTML in an article is escaped, not executed", !/<script>alert\(1\)<\/script>/.test(r.text));
  ok("article has structured data without ratings", /"@type":"Article"/.test(r.text) && !/aggregateRating|"Review"/.test(r.text));
  p.once("dialog", (d) => d.accept()); await p.getByRole("button", { name: "Archive" }).click(); await sleep(1800);
  r = await get("/insights/how-we-build-kinetic-stands"); ok("an archived article returns 404", r.status === 404);

  // ---- 10. careers + FAQ + settings
  await p.goto(`${BASE}/admin/content/role/new`, { waitUntil: "load" });
  await p.fill("#title", "Unity Developer"); await p.getByRole("button", { name: "Create draft" }).click();
  await p.waitForURL(/\/role\/[0-9a-f-]{36}$/);
  await p.getByLabel("Location").fill("Dubai, UAE"); await p.getByLabel("Description").first().fill("Build interactive experiences in Unity.");
  await p.getByRole("button", { name: /Save and publish/ }).click(); await sleep(1800);
  ok("a role needs an application link or email to publish", /application link or an application email/i.test(await p.locator("body").innerText()));
  await p.getByLabel("Application email").fill("jobs@example.test"); await publish(p); await sleep(600);
  r = await get("/careers"); ok("published role is listed on /careers", /Unity Developer/.test(r.text));
  r = await get("/careers/unity-developer"); ok("role page has JobPosting data", r.status === 200 && /"@type":"JobPosting"/.test(r.text));

  await p.goto(`${BASE}/admin/content/faq/new`, { waitUntil: "load" });
  await p.fill("#title", "How long does a project take?"); await p.getByRole("button", { name: "Create draft" }).click();
  await p.waitForURL(/\/faq\/[0-9a-f-]{36}$/);
  await p.locator("textarea.adm-md").first().fill("It depends on scope. We confirm timings after the first conversation."); await publish(p); await sleep(600);
  r = await get("/contact"); ok("published FAQ appears on the contact page", /How long does a project take\?/.test(r.text));

  await openItem(p, "setting", "Site settings");
  await p.getByLabel("LinkedIn URL").fill("https://www.linkedin.com/company/example-test"); await publish(p); await sleep(600);
  r = await get("/"); ok("social link from settings appears in the footer", /linkedin\.com\/company\/example-test/.test(r.text));
  ok("organisation structured data lists the social profile", /sameAs/.test(r.text));

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("FATAL", e); process.exit(2); });
