// Optimise a photo and print its registry entry.
//   node scripts/images/ingest.mjs <id> <file> --alt "..." --focal 0.5,0.3 --kind portrait|scene \
//        --licence "Unsplash License" --source https://... --credit "Photographer" [--status real|stock|preview-portrait]
// Writes public/photos/<id>-{480,960,1600}.webp (+ a 24px blur placeholder inline in the printed entry) and keeps the original
// in docs/licences/originals/ is NOT done (originals stay out of git); the licence record goes to docs/licences/<id>.json.
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const [, , id, file, ...rest] = process.argv;
if (!id || !file) { console.error("usage: ingest.mjs <id> <file> --alt .. --focal x,y --kind .. --licence .. --source .. --credit .."); process.exit(1); }
const opt = (k, d = "") => { const i = rest.indexOf("--" + k); return i > -1 ? rest[i + 1] : d; };
const [fx, fy] = opt("focal", "0.5,0.5").split(",").map(Number);
const widths = [480, 960, 1600];

mkdirSync("public/photos", { recursive: true });
mkdirSync("docs/licences", { recursive: true });
const img = sharp(file).rotate();
const meta = await img.metadata();
for (const w of widths) {
  if (w > meta.width && w !== widths[0]) continue;
  await img.clone().resize({ width: Math.min(w, meta.width) }).webp({ quality: 78, effort: 5 }).toFile(`public/photos/${id}-${w}.webp`);
}
const tiny = await img.clone().resize({ width: 24 }).webp({ quality: 40 }).toBuffer();
const entry = {
  id, kind: opt("kind", "scene"), status: opt("status", "stock"),
  src: `/photos/${id}`, widths: widths.filter((w) => w <= meta.width || w === widths[0]),
  width: meta.width, height: meta.height, focal: [fx, fy], alt: opt("alt"),
  blur: `data:image/webp;base64,${tiny.toString("base64")}`,
  credit: opt("credit"), source: opt("source"), licence: opt("licence"),
};
writeFileSync(`docs/licences/${id}.json`, JSON.stringify({ ...entry, blur: undefined, ingestedAt: new Date().toISOString().slice(0, 10) }, null, 2));
const REG = "src/content/images.generated.json";
const reg = existsSync(REG) ? JSON.parse(readFileSync(REG, "utf8")) : {};
reg[id] = entry;
writeFileSync(REG, JSON.stringify(reg, null, 2) + "\n");
console.log(`registered ${id} (${entry.status}) in ${REG}`);
