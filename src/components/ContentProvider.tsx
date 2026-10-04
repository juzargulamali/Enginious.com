"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Project } from "@/content/projects";
import type { Technology } from "@/content/technologies";
import type { Person } from "@/content/team";
import type { LeaderInfo } from "@/content/leaders";
import type { Client } from "@/content/clients";
import type { ImageAsset } from "@/content/images";
import { SLOTS } from "@/content/images";
import type { RegionKey } from "@/content/site";

/**
 * The slice of published content that client components need, supplied once by the (site) layout from the CMS (or the
 * built-in starter content). Kept lean on purpose: long text (challenge, article bodies, ...) stays on the server.
 */
export interface LeanRegion { key: RegionKey; name: string; role: string; email: string | null; phone: string | null; city: string | null; href: string }
export interface ClientContent {
  projects: Project[];
  technologies: Technology[];
  people: Person[];
  leaders: Record<string, LeaderInfo>;
  clients: Client[];
  regions: Record<RegionKey, LeanRegion>;
  general: { email: string; phone: string };
  images: Record<string, ImageAsset>;
  slots: Record<string, string>;
}

const Ctx = createContext<ClientContent | null>(null);

export function ContentProvider({ value, children }: { value: ClientContent; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useContent() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useContent must be used inside <ContentProvider> (the (site) layout provides it).");
  return useMemo(() => {
    const techMap = new Map(c.technologies.map((t) => [t.slug, t]));
    const projMap = new Map(c.projects.map((p) => [p.slug, p]));
    const clientMap = new Map(c.clients.map((x) => [x.id, x]));
    return {
      ...c,
      techBySlug: (s: string) => techMap.get(s),
      projectBySlug: (s: string) => projMap.get(s),
      clientById: (id: string) => clientMap.get(id),
      hasConfirmedRelationships: c.clients.some((x) => x.relationship !== "unconfirmed"),
      imageById: (id: string) => c.images[id],
      /** Slot -> asset: the CMS choice first, then the built-in default. */
      imageForSlot: (slot: string): ImageAsset | undefined => c.images[c.slots[slot] ?? (SLOTS as Record<string, string>)[slot] ?? ""],
    };
  }, [c]);
}
