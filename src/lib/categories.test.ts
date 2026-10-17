import test from "node:test";
import assert from "node:assert/strict";
import { resolveTechCategories, TECH_CATEGORIES } from "../content/technologies.ts";

test("built-in categories include Interactive Digital Games", () => {
  assert.ok(TECH_CATEGORIES.some((c) => c.key === "games" && c.label === "Interactive Digital Games"));
  assert.equal(resolveTechCategories(undefined), TECH_CATEGORIES);
  assert.equal(resolveTechCategories([]), TECH_CATEGORIES);
});

test("CMS category records: keys are made from names, duplicates and blanks are dropped", () => {
  const r = resolveTechCategories([{ label: "Light & Sound" }, { label: " ", key: "x" }, { label: "Other", key: "light-and-sound" }, { label: "Games", key: "games", blurb: "Play." }]);
  assert.deepEqual(r.map((c) => c.key), ["light-and-sound", "games"]);
  assert.equal(r[1].blurb, "Play.");
});
