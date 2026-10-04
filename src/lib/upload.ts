// File validation shared by the media library and enquiry attachments. Pure and self-contained (runs under `node --test`).
// We never trust the browser's Content-Type or the file extension: the type is decided from the file's own signature.

export type SniffedType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export function sniffType(buf: Uint8Array): SniffedType | null {
  const b = buf;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "application/pdf";
  return null;
}

export const EXTENSION: Record<SniffedType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/** Display-only name: strips paths and control characters, keeps it short. Storage paths never use this. */
export function safeDisplayName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[\u0000-\u001f\u007f<>:"|?*]+/g, "").replace(/\s+/g, " ").trim().slice(0, 120);
  return cleaned || "file";
}

/** True for names that are clearly not an allowed upload, regardless of content (defence in depth, shown as a clear message). */
export function hasBlockedExtension(name: string): boolean {
  return /\.(exe|dll|bat|cmd|com|msi|scr|js|mjs|cjs|jar|vbs|ps1|sh|php|py|rb|html?|svg|svgz|xml|swf|lnk|apk|dmg|iso)$/i.test(name.trim());
}

export function formatBytes(n: number): string {
  return n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`;
}
