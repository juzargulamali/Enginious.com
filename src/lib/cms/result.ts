/** Uniform result for Server Actions: never throws raw errors to the browser. */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string>; code?: "unauthenticated" | "forbidden" | "validation" | "conflict" | "not_found" | "unavailable" };

export const fail = (error: string, code?: "unauthenticated" | "forbidden" | "validation" | "conflict" | "not_found" | "unavailable", fieldErrors?: Record<string, string>) =>
  ({ ok: false, error, code, fieldErrors }) as const;

/** Map a Postgres/PostgREST error to a message that is safe and useful to show an editor (no SQL, no internals). */
export function friendlyDbError(err: { code?: string; message?: string } | null | undefined): { error: string; code: "forbidden" | "validation" | "conflict" | "not_found" | "unavailable" } {
  const c = err?.code ?? "";
  const m = err?.message ?? "";
  if (c === "42501" || /row-level security/i.test(m)) return { error: "You do not have permission to do that.", code: "forbidden" };
  if (c === "23505") return { error: "That value is already in use (for example, a duplicate slug).", code: "conflict" };
  if (c === "P0002") return { error: "That item no longer exists.", code: "not_found" };
  if (c === "P0001") return { error: m.replace(/^validation:\s*/, "") || "That change is not allowed.", code: "validation" };
  if (c === "23514" || c === "23502" || c === "22P02") return { error: "Some values are not valid. Please check the form.", code: "validation" };
  return { error: "Something went wrong. Please try again.", code: "unavailable" };
}
