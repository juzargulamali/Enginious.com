// Places a latitude/longitude on the basemap, the same Mercator projection scripts/build-map.mjs used for the built-in places.
import { MAP } from "./map.ts";

const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/** [x%, y%] on the map for a longitude and latitude. */
export function mapPoint(lon: number, lat: number): [number, number] {
  const { ax, bx, ay, by } = MAP.proj;
  return [ax * lon + bx, by - ay * merc(lat)];
}

/** Which zoom view a place belongs to. */
export function mapGroup(lon: number, lat: number): "gulf" | "europe" | "world" {
  if (lon >= 34 && lon <= 64 && lat >= 17 && lat <= 34) return "gulf";
  if (lon >= -10 && lon <= 30 && lat >= 36 && lat <= 58) return "europe";
  return "world";
}

/** Does the map show this latitude/longitude? The basemap covers longitudes -128 to 128 and latitudes -36 to 62. */
export const onMap = (lon: number, lat: number) => lon >= -128 && lon <= 128 && lat >= -36 && lat <= 62;
