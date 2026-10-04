import test from "node:test";
import assert from "node:assert/strict";
import { parseMarkdown, safeHref, toPlainText } from "./markdown.ts";

test("script and html are never produced: raw tags stay inert text", () => {
  const b = parseMarkdown("<script>alert(1)</script> <img src=x onerror=alert(1)>");
  assert.equal(b.length, 1);
  assert.equal(b[0].t, "p");
  assert.equal(JSON.stringify(b).includes('"t":"link"'), false);
});

test("only https, mailto and relative links survive", () => {
  assert.deepEqual(safeHref("https://enginious.ae/x"), { href: "https://enginious.ae/x", external: true });
  assert.deepEqual(safeHref("/work/whx"), { href: "/work/whx", external: false });
  assert.equal(safeHref("javascript:alert(1)"), null);
  assert.equal(safeHref("data:text/html,x"), null);
  assert.equal(safeHref("//evil.example"), null);
  assert.equal(safeHref("http://insecure.example"), null);
  const b = parseMarkdown("[click](javascript:alert(1))");
  assert.equal(JSON.stringify(b).includes("javascript"), false);
});

test("headings, lists, emphasis and rules", () => {
  const b = parseMarkdown("## Title\n\nSome **bold** and *it* text.\n\n- one\n- two\n\n1. a\n2. b\n\n---");
  assert.deepEqual(b.map((x) => x.t), ["h", "p", "ul", "ol", "hr"]);
});

test("youtube embeds are restricted to valid ids", () => {
  assert.equal(parseMarkdown("{{youtube:OtAjMig32ZE}}")[0].t, "youtube");
  assert.equal(parseMarkdown("{{youtube:bad id\"><script>}}").some((b) => b.t === "youtube"), false);
});

test("plain text summary strips formatting", () => {
  assert.equal(toPlainText("## Hi\n\n**Bold** [link](https://x.co/a) text"), "Hi Bold link text");
});
