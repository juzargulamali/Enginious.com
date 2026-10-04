import test from "node:test";
import assert from "node:assert/strict";
import { CONSENT_KEY, isAllowedAnalyticsSrc, readConsent, sanitizeEventProps, writeConsent } from "./consent.ts";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

test("consent defaults to unset and only 'granted' enables optional scripts", () => {
  const s = mem();
  assert.equal(readConsent(s), "unset");
  writeConsent("denied", s); assert.equal(readConsent(s), "denied");
  writeConsent("granted", s); assert.equal(readConsent(s), "granted");
  s.setItem(CONSENT_KEY, "yes please"); assert.equal(readConsent(s), "unset");
});

test("blocked storage means no consent", () => {
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(readConsent(broken), "unset");
  assert.doesNotThrow(() => writeConsent("granted", broken));
});

test("analytics script must be https (or local http)", () => {
  assert.equal(isAllowedAnalyticsSrc("https://analytics.example/script.js"), true);
  assert.equal(isAllowedAnalyticsSrc("http://127.0.0.1:9999/a.js"), true);
  for (const bad of ["http://analytics.example/a.js", "javascript:alert(1)", "data:text/javascript,1", "//cdn.example/a.js", "", undefined]) assert.equal(isAllowedAnalyticsSrc(bad as string), false, String(bad));
});

test("event properties never carry personal data", () => {
  const clean = sanitizeEventProps({ technology: "tri-helix", region: "ksa", step: 2, email: "a@b.co", user_name: "Ann", message: "hello", contact: "someone@example.com", phone: "+971 4 251 5127", note: "call 0501234567", free: "x".repeat(80), reference: "ENQ-ABCDEFGH" });
  assert.deepEqual(clean, { technology: "tri-helix", region: "ksa", step: 2 });
});
