import type { ReactNode } from "react";

/**
 * Content-approval notes are INTERNAL: they live in docs/content-todo.md, never on public pages.
 * Kept as a no-op so existing call sites render nothing; remove the calls as pages are redesigned.
 */
export function ReviewNote({ children }: { children?: ReactNode }) {
  void children;
  return null;
}
