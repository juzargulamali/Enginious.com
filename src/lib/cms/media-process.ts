import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { EXTENSION, sniffType, type SniffedType } from "@/lib/upload";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // hosting platforms cap request bodies (about 4.5 MB on Vercel)
export const VARIANT_WIDTHS = [480, 960, 1600] as const;
const MAX_PIXELS = 40_000_000;

export interface ProcessedImage {
  uuid: string;
  width: number;
  height: number;
  variants: { width: number; data: Buffer }[];
  original: { data: Buffer; type: SniffedType; ext: string };
}

export class UploadError extends Error {}

/** Decode, auto-rotate, strip metadata and re-encode as WebP at several widths. Never upscales. Throws UploadError with a user-safe message. */
export async function processImage(buf: Buffer): Promise<ProcessedImage> {
  const type = sniffType(buf);
  if (!type || type === "application/pdf") throw new UploadError("Only JPEG, PNG and WebP images are accepted. SVG and other formats are not allowed.");
  let meta;
  try { meta = await sharp(buf, { limitInputPixels: MAX_PIXELS }).metadata(); } catch { throw new UploadError("This image could not be read. It may be corrupt or too large (maximum 40 megapixels)."); }
  if (!meta.width || !meta.height) throw new UploadError("This image has no readable dimensions.");
  const rotated = (meta.orientation ?? 1) >= 5; // EXIF orientation swaps width and height
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  if (width < 200 || height < 200) throw new UploadError("The image is too small (minimum 200 x 200 pixels).");
  const targets = [...new Set([...VARIANT_WIDTHS.filter((w) => w < width), width <= VARIANT_WIDTHS[2] ? width : VARIANT_WIDTHS[2]])].sort((a, b) => a - b);
  const variants: ProcessedImage["variants"] = [];
  try {
    for (const w of targets) {
      const data = await sharp(buf, { limitInputPixels: MAX_PIXELS }).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
      variants.push({ width: w, data });
    }
  } catch { throw new UploadError("This image could not be processed."); }
  return { uuid: randomUUID(), width, height, variants, original: { data: buf, type, ext: EXTENSION[type] } };
}

/** PDFs are stored as supplied after a signature check and a refusal of obviously active content. */
export function checkPdf(buf: Buffer): void {
  if (sniffType(buf) !== "application/pdf") throw new UploadError("This is not a PDF file.");
  const head = buf.subarray(0, Math.min(buf.length, 2_000_000)).toString("latin1");
  if (/\/(JavaScript|JS|Launch|RichMedia)\b/.test(head)) throw new UploadError("This PDF contains scripts or launch actions and was refused. Re-export it as a plain PDF.");
}
