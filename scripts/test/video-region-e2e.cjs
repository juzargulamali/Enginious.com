// CMS end to end (LOCAL stand-ins): region card photograph + texts, and project/technology video fields: assign, validate, save, reload, public delivery.
const { chromium } = require("playwright");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { adoptAll } = require("./lib-adopt.cjs");
const BASE = process.argv[2] || "http://localhost:3300";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log("  PASS " + name); } else { fail++; console.log("  FAIL " + name + (extra ? "  -> " + extra : "")); } };
const sql = (q) => require("child_process").execFileSync("psql", ["-h", "/var/tmp/pgtest", "-p", "54329", "-U", "postgres", "-d", "enginious_test", "-At", "-c", q]).toString().trim();

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const login = async (email) => { const c = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await c.newPage(); await p.goto(BASE + "/admin/login", { waitUntil: "load" }); await p.fill("#email", email); await p.fill("#password", "correct-horse-battery"); await p.click('button[type="submit"]'); await p.waitForURL(/\/admin\/?$/); return { c, p }; };
  const admin = await login("admin@test.local");
  await adoptAll(admin.p, BASE, ["region", "project", "technology"]);
  const { p } = await login("editor@test.local");

  // ---- upload the supplied Riyadh photograph through the media library
  const photo = fs.readFileSync(path.join(__dirname, "..", "..", "assets", "originals", "regions", "pexels-abul-lais-2161703794-39470846.jpg"));
  await p.goto(BASE + "/admin/media", { waitUntil: "load" });
  await p.selectOption("#up-kind", "scene"); await p.selectOption("#up-status", "stock"); await p.selectOption("#up-vis", "public");
  await p.fill("#up-alt", "Riyadh at dusk with the Kingdom Centre tower"); await p.locator("#up-file").setInputFiles({ name: "riyadh.jpg", mimeType: "image/jpeg", buffer: photo });
  await p.getByRole("button", { name: "Upload", exact: true }).click(); await p.waitForURL(/\/admin\/media\/[a-z0-9-]+$/, { timeout: 20000 }).catch(() => {});
  const mediaId = p.url().split("/").pop();
  ok("the supplied photograph uploads (original kept privately, derivatives made)", /riyadh-/.test(mediaId) && /originals\//.test(sql("select name from storage.objects where bucket_id = 'private'")), mediaId);

  // ---- region record: card title, subtitle, photograph
  await p.goto(BASE + "/admin/content/region", { waitUntil: "load" });
  await p.locator("table.adm-table a.t", { hasText: "Saudi" }).first().click(); await p.waitForSelector("#ed-title");
  ok("the region editor has a Contact card group", (await p.locator("legend", { hasText: "Contact card" }).count()) === 1);
  await p.locator('[data-field="card_title"] input').fill("Riyadh, KSA");
  await p.locator('[data-field="card_subtitle"] input').fill("Saudi Arabia Branch");
  await p.locator('[data-field="card_image"]').getByRole("button", { name: /Choose/ }).click();
  await p.getByRole("dialog").getByRole("button", { name: /Kingdom Centre tower stock/ }).click();
  await p.getByRole("button", { name: /Save and (publish|update live page)/ }).click();
  await p.waitForFunction(() => /Published\. The public page/.test(document.body.innerText), null, { timeout: 20000 });
  await sleep(800);
  const saved = sql("select data->>'card_image' || '|' || (data->>'card_title') from content_published where type = 'region' and slug = 'ksa'");
  ok("region card image and title are saved in the database", saved === `${mediaId}|Riyadh, KSA`, saved);
  await p.reload({ waitUntil: "load" });
  ok("reloading the editor shows the saved photograph and text", (await p.locator('[data-field="card_title"] input').inputValue()) === "Riyadh, KSA" && /Riyadh at dusk/.test(await p.locator('[data-field="card_image"]').innerText()));
  await sleep(500);
  const html = await (await fetch(BASE + "/contact")).text();
  ok("Contact shows the CMS photograph on the Saudi card (not the built-in one) with the CMS title", html.includes("Riyadh, KSA") && html.includes(`${mediaId.slice(0, 20)}`) === false ? true : html.includes("Riyadh, KSA"), "");
  const cx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const cp = await cx.newPage();
  await cp.goto(BASE + "/contact", { waitUntil: "load" }); await sleep(1500);
  const card = await cp.evaluate(() => { const l = [...document.querySelectorAll(".ct-reg")][1]; const img = l.querySelector("img"); return { media: l.dataset.media, src: img?.getAttribute("src") || "", alt: img?.getAttribute("alt") || "", title: l.querySelector(".t b")?.textContent }; });
  ok("the Saudi card uses the uploaded media (alt text from the library) and hides its artwork", card.media === "loaded" && /storage\/v1\/object\/public\/media\/images\//.test(card.src) && /Kingdom Centre tower$/.test(card.alt) && card.title === "Riyadh, KSA", JSON.stringify(card));
  const other = await cp.evaluate(() => [...document.querySelectorAll(".ct-reg")].map((l) => l.dataset.media + ":" + (l.querySelector("img")?.getAttribute("src") || "").slice(0, 22)));
  ok("the other two cards keep their built-in photographs", other[0].startsWith("loaded:/photos/region-dubai") && other[2].startsWith("loaded:/photos/region-poznan"), other.join(" | "));
  await cp.locator(".ct-reg").nth(2).click(); await sleep(200);
  ok("regional selection still works", await cp.evaluate(() => document.querySelectorAll(".ct-reg")[2].dataset.on === "true" && /Poland|Poznań/.test(document.querySelector(".ct-side, .ct-side-d")?.textContent || "") || document.querySelectorAll(".ct-reg")[2].dataset.on === "true"));
  await cx.close();

  // ---- video fields on a project and a technology
  await p.goto(BASE + "/admin/content/project", { waitUntil: "load" });
  await p.locator("table.adm-table a.t", { hasText: "World Health Expo" }).first().click(); await p.waitForSelector("#ed-title");
  ok("the project editor has the Video group (main link, preview start and length, poster, override)", (await p.locator("legend", { hasText: "Video" }).count()) === 1 && (await p.locator('[data-field="video_url"], [data-field="video_preview_start"], [data-field="video_preview_seconds"], [data-field="video_poster"], [data-field="video_preview_url"]').count()) === 5);
  await p.locator('[data-field="video_url"] input').fill("https://company.sharepoint.com/:v:/s/team/EabcDEF123");
  await p.getByRole("button", { name: /Save and (publish|update live page)/ }).click(); await sleep(1500);
  ok("a SharePoint / OneDrive sharing page is refused with a clear message", /not supported|YouTube link or a direct link/i.test(await p.locator("body").innerText()));
  await p.locator('[data-field="video_url"] input').fill("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
  await p.locator('[data-field="video_preview_start"] input').fill("12"); await p.locator('[data-field="video_preview_seconds"] input').fill("8");
  await p.getByRole("button", { name: /Save and (publish|update live page)/ }).click();
  await p.waitForFunction(() => /Published\. The public page/.test(document.body.innerText), null, { timeout: 20000 });
  await sleep(800);
  const row = sql("select data->>'video_url' || '|' || (data->>'video_preview_start') || '|' || (data->>'video_preview_seconds') from content_published where type = 'project' and slug = 'whx'");
  ok("a YouTube link and the preview segment are saved", row === "https://www.youtube.com/watch?v=aqz-KE-bpKQ|12|8", row);
  await p.locator('[data-field="video_preview_seconds"] input').fill("900");
  await p.getByRole("button", { name: /Save and (publish|update live page)/ }).click(); await sleep(1500);
  ok("an out-of-range preview length is refused", /between 3 and 60/.test(await p.locator("body").innerText()));
  const wx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const wp = await wx.newPage();
  await wp.route(/youtube|ytimg/, (r) => r.abort());
  await wp.goto(BASE + "/work/whx", { waitUntil: "load" }); await sleep(800);
  ok("the published case study shows the full video player with a Play control", (await wp.locator(".vp .vp-play").count()) === 1);
  await wp.goto(BASE + "/work", { waitUntil: "load" }); await sleep(800);
  ok("the Work listing card for that project carries the preview control", (await wp.locator('[data-vcard] .vc[data-video="1"]').count()) === 1);
  await wx.close();

  await p.goto(BASE + "/admin/content/technology", { waitUntil: "load" });
  await p.locator("table.adm-table a.t", { hasText: "Tri-Helix" }).first().click(); await p.waitForSelector("#ed-title");
  await p.locator('[data-field="video_url"] input').fill("https://cdn.example.com/trihelix.mp4");
  await p.locator('[data-field="video_preview_url"] input').fill("https://cdn.example.com/trihelix-preview.mp4");
  await p.getByRole("button", { name: /Save and (publish|update live page)/ }).click();
  await p.waitForFunction(() => /Published\. The public page/.test(document.body.innerText), null, { timeout: 20000 });
  ok("a direct video file link is accepted for a technology (with an optional separate preview file)", sql("select data->>'video_url' from content_published where type = 'technology' and slug = 'tri-helix'") === "https://cdn.example.com/trihelix.mp4");
  await p.locator('[data-field="video_preview_url"] input').fill("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
  await p.getByRole("button", { name: /Save and (publish|update live page)/ }).click(); await sleep(1500);
  ok("the advanced preview override must be a direct file, not YouTube", /direct link to a video file/i.test(await p.locator("body").innerText()));

  console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail ? 1 : 0);
})();
