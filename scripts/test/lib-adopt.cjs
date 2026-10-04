// Shared helper for the e2e suites: the explicit reviewed publishing step of the starter-content import (administrator only).
async function importDrafts(p, BASE, type) {
  await p.goto(`${BASE}/admin/content/${type}`, { waitUntil: "load" });
  p.once("dialog", (d) => d.accept());
  await p.getByRole("button", { name: "Import starter content as drafts" }).click();
  await p.waitForSelector("table.adm-table", { timeout: 30000 });
}
async function reviewAndPublish(p, BASE, type) {
  await p.goto(`${BASE}/admin/content/${type}`, { waitUntil: "load" });
  await p.getByRole("button", { name: "Review and publish imported content" }).click();
  await p.getByLabel(/I have opened and reviewed every imported item/).check();
  await p.getByRole("button", { name: "Publish reviewed content" }).click();
  await p.waitForFunction(() => /Published \d+ reviewed item/.test(document.body.innerText), null, { timeout: 40000 });
}
async function adoptAll(p, BASE, types) { for (const t of types) { await importDrafts(p, BASE, t); await reviewAndPublish(p, BASE, t); } }
module.exports = { importDrafts, reviewAndPublish, adoptAll };
