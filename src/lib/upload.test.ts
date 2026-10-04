import test from "node:test";
import assert from "node:assert/strict";
import { hasBlockedExtension, safeDisplayName, sniffType } from "./upload.ts";

const bytes = (...a: number[]) => new Uint8Array(a);

test("file type comes from the signature, not the name", () => {
  assert.equal(sniffType(bytes(0xff, 0xd8, 0xff, 0xe0, 0)), "image/jpeg");
  assert.equal(sniffType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), "image/png");
  assert.equal(sniffType(new TextEncoder().encode("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ")), "image/webp");
  assert.equal(sniffType(new TextEncoder().encode("%PDF-1.7\n")), "application/pdf");
});

test("executables, scripts, svg and html are not recognised", () => {
  assert.equal(sniffType(new TextEncoder().encode("MZ\u0090\u0000")), null);
  assert.equal(sniffType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>")), null);
  assert.equal(sniffType(new TextEncoder().encode("<html><script>alert(1)</script></html>")), null);
  assert.equal(sniffType(new TextEncoder().encode("#!/bin/sh\nrm -rf /")), null);
  assert.equal(sniffType(new Uint8Array(0)), null);
});

test("a disguised file is judged by content: svg renamed .jpg is still rejected", () => {
  assert.equal(sniffType(new TextEncoder().encode("<?xml version='1.0'?><svg/>")), null);
});

test("blocked extensions", () => {
  for (const n of ["a.exe", "b.SVG", "c.html", "d.js", "e.php", "f.sh"]) assert.equal(hasBlockedExtension(n), true, n);
  for (const n of ["a.pdf", "b.png", "c.jpeg", "d.webp"]) assert.equal(hasBlockedExtension(n), false, n);
});

test("display names are stripped of paths and control characters", () => {
  assert.equal(safeDisplayName("../../etc/passwd"), "passwd");
  assert.equal(safeDisplayName("C:\\Users\\x\\brief.pdf"), "brief.pdf");
  assert.equal(safeDisplayName("a\u0000b\nc.pdf"), "abc.pdf");
  assert.equal(safeDisplayName("   "), "file");
});
