import test from "node:test";
import assert from "node:assert/strict";
import { PLACES_DATA } from "../content/places.ts";
import { PROJECTS } from "../content/projects.ts";
import { norm, mentions, projectsAt } from "../content/mapMatch.ts";

const placesOf = (slug: string) => {
  const proj = PROJECTS.map((p) => ({ slug: p.slug, location: p.location }));
  return PLACES_DATA.filter((pl) => pl.project && projectsAt(pl, proj).includes(slug)).map((pl) => pl.name);
};

test("every published project with a city or country in its Location appears on the map (only the unlocated one does not)", () => {
  const unplaced = PROJECTS.filter((p) => placesOf(p.slug).length === 0).map((p) => `${p.slug} (${p.location})`);
  console.log("project locations -> map places:\n" + PROJECTS.map((p) => `  ${p.location.padEnd(34)} -> ${placesOf(p.slug).join(", ") || "(not on map)"}`).join("\n"));
  assert.deepEqual(unplaced.map((u) => u.replace(/^[^ ]+ /, "")), ["(UAE (multi-location))"]); // "UAE (multi-location)" names no city, so it has no pin
});

test("common city-name variants find the same place", () => {
  const at = (id: string, loc: string) => projectsAt(PLACES_DATA.find((p) => p.id === id)!, [{ slug: "x", location: loc }]).length === 1;
  for (const [id, loc] of [
    ["abu-dhabi", "Abu-Dhabi, UAE"], ["abu-dhabi", "ABU DHABI"], ["abu-dhabi", "AbuDhabi"], ["dubai", "Dubai,UAE"], ["dubai", "WTC, Dubai, UAE"],
    ["riyadh", "Riyadh City, KSA"], ["riyadh", "Ar-Riyadh"], ["jeddah", "Jiddah"], ["jeddah", "Jedda, Saudi Arabia"],
    ["madinah", "Medina, Saudi Arabia"], ["madinah", "Al-Madinah"], ["madinah", "Madina"], ["doha", "Qatar"], ["doha", "Doha, Qatar"],
    ["muscat", "Muscat, Oman"], ["brazil", "Belém, Brazil"], ["brazil", "Belem"], ["hannover", "Hanover, Germany"], ["vienna", "Wien"], ["poland", "Poznań"],
  ] as const) assert.ok(at(id, loc), `${id} should match "${loc}"`);
});

test("matching is whole word: no false matches", () => {
  const at = (id: string, loc: string) => projectsAt(PLACES_DATA.find((p) => p.id === id)!, [{ slug: "x", location: loc }]).length === 1;
  assert.ok(!at("muscat", "Romania"), "Oman must not match inside Romania");
  assert.ok(!at("dubai", "UAE"), "Dubai must not claim every UAE project");
  assert.ok(!at("riyadh", "Jeddah, Saudi Arabia"));
  assert.equal(norm("Belém,  Brazil"), "belem brazil");
  assert.ok(mentions("Tabuk, Saudi Arabia", ["Tabuk"]) && !mentions("Tabukistan", ["Tabuk"]));
});

test("a spelling added in Site settings is honoured", () => {
  const tabuk = { id: "cms-tabuk", name: "Tabuk" };
  assert.deepEqual(projectsAt(tabuk, [{ slug: "a", location: "Tabouk, KSA" }], ["Tabouk"]), ["a"]);
});
