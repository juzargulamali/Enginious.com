// Cookie/analytics consent state and the PII-safe event sanitiser. Pure and self-contained (runs under `node --test`).
// Nothing optional (analytics, marketing) may load until consent is "granted". Required functionality never depends on it.

export type Consent = "granted" | "denied" | "unset";
export const CONSENT_KEY = "enginious-consent-v1";

type Store = Pick<Storage, "getItem" | "setItem">;

export function readConsent(store?: Store): Consent {
  try {
    const v = (store ?? globalThis.localStorage)?.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : "unset";
  } catch {
    return "unset"; // storage blocked: treat as no consent
  }
}

export function writeConsent(value: Exclude<Consent, "unset">, store?: Store): void {
  try { (store ?? globalThis.localStorage)?.setItem(CONSENT_KEY, value); } catch { /* ignore */ }
}

/** Only an https script (or plain http on localhost for local testing) may be loaded as analytics. */
export function isAllowedAnalyticsSrc(src: string | undefined | null): boolean {
  if (!src) return false;
  try {
    const u = new URL(src);
    return u.protocol === "https:" || (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"));
  } catch { return false; }
}

const PII_KEY = /(^|_|-)(e-?mail|name|phone|tel|mobile|message|company|address|ip|user|token|password|reference|ref|submission)(_|-|$)/i;
const EMAIL_LIKE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const LONG_DIGITS = /\d{7,}/;

/** Drops anything that could identify a person from an analytics event: PII-looking keys, emails, long numbers, long free text. */
export function sanitizeEventProps(props: Record<string, unknown> | undefined): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props ?? {})) {
    if (PII_KEY.test(k)) continue;
    if (typeof v === "number" || typeof v === "boolean") { out[k] = v; continue; }
    if (typeof v !== "string") continue;
    if (v.length > 60 || EMAIL_LIKE.test(v) || LONG_DIGITS.test(v)) continue;
    out[k] = v;
  }
  return out;
}
