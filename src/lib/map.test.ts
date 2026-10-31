import test from "node:test";
import assert from "node:assert/strict";
import { mapPoint, mapGroup, onMap } from "../content/mapProject.ts";
import { MAP } from "../content/map.ts";

test("runtime projection reproduces the built-in marker positions (so extra map locations land in the right place)", () => {
  const ll: Record<string, [number, number]> = { dubai: [55.27, 25.2], riyadh: [46.68, 24.71], london: [-0.13, 51.51], "las-vegas": [-115.14, 36.17], shanghai: [121.47, 31.23], brazil: [-52, -12], madinah: [39.61, 24.47] };
  for (const [id, [lon, lat]] of Object.entries(ll)) {
    const [x, y] = mapPoint(lon, lat), p = (MAP.points as Record<string, readonly number[]>)[id];
    assert.ok(Math.abs(x - p[0]) < 0.02 && Math.abs(y - p[1]) < 0.02, `${id}: ${x.toFixed(3)},${y.toFixed(3)} vs ${p}`);
  }
});

test("zoom groups and map coverage", () => {
  assert.equal(mapGroup(55.27, 25.2), "gulf");
  assert.equal(mapGroup(2.35, 48.86), "europe");
  assert.equal(mapGroup(-80, 25), "world");
  assert.ok(onMap(0, 0) && !onMap(0, 80) && !onMap(150, 10));
});
