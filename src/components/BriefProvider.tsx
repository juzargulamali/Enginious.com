"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

const KEY = "enginious.brief.v1";
const listeners = new Set<() => void>();
let memory = "[]"; // fallback when storage is unavailable

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}
function write(value: string) {
  memory = value;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* storage unavailable: shortlist lives in memory only */
  }
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

interface BriefCtx {
  items: string[];
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
}

const Ctx = createContext<BriefCtx | null>(null);

/** Technology shortlist that becomes part of the project enquiry. Stored only in this browser. */
export function BriefProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  const items = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, 12) : [];
    } catch {
      return [];
    }
  }, [raw]);

  const set = useCallback((next: string[]) => write(JSON.stringify(next)), []);

  const value = useMemo<BriefCtx>(
    () => ({
      items,
      has: (s) => items.includes(s),
      toggle: (s) => set(items.includes(s) ? items.filter((x) => x !== s) : [...items, s].slice(0, 12)),
      remove: (s) => set(items.filter((x) => x !== s)),
      clear: () => set([]),
    }),
    [items, set],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBrief() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useBrief must be used inside BriefProvider");
  return c;
}
