"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * One listing, one preview. Cards ask to preview; the provider keeps a single active id, so at most one preview player
 * (YouTube or file) is ever mounted across the whole list. A hidden tab clears it.
 */
type Ctx = { active: string | null; activate: (id: string) => void; deactivate: (id: string) => void };
const PreviewCtx = createContext<Ctx>({ active: null, activate: () => {}, deactivate: () => {} });

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<string | null>(null);
  const activate = useCallback((id: string) => setActive(id), []);
  const deactivate = useCallback((id: string) => setActive((cur) => (cur === id ? null : cur)), []);
  useEffect(() => {
    const vis = () => { if (document.hidden) setActive(null); };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);
  const value = useMemo(() => ({ active, activate, deactivate }), [active, activate, deactivate]);
  return <PreviewCtx.Provider value={value}>{children}</PreviewCtx.Provider>;
}
export const usePreview = () => useContext(PreviewCtx);
