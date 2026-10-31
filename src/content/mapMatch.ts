// Which projects belong under which map place, by the project's Location text. Pure and import-free so a test can run it on the real project list.
import type { Place } from "./places.ts";

/** Lower case, accents removed, punctuation and dashes read as spaces: "Abu-Dhabi", "ABU DHABI," and "Abu Dhabi" are the same. */
export const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[-_.,/()]+/g, " ").replace(/\s+/g, " ").trim();

/** Other common spellings and names a project Location may use for a built-in place. */
export const ALIASES: Record<string, string[]> = {
  dubai: ["Dubayy"],
  "abu-dhabi": ["AbuDhabi", "Abu Dhabi City", "Abou Dhabi"],
  riyadh: ["Riyad", "Ar Riyadh", "Al Riyadh", "Riyadh City"],
  jeddah: ["Jiddah", "Jedda", "Jidda", "Jeddah City"],
  madinah: ["Madina", "Medina", "Al Madinah", "Madinah Al Munawwarah"],
  doha: ["Al Doha", "Qatar"],
  muscat: ["Masqat", "Oman"],
  bahrain: ["Manama", "Kingdom of Bahrain"],
  kuwait: ["Kuwait City"],
  hannover: ["Hanover"],
  vienna: ["Wien"],
  miami: ["Miami Beach"],
  "las-vegas": ["Vegas"],
  brazil: ["Brasil", "Belem"],
  poland: ["Polska", "Poznan"],
  shanghai: [],
};

const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Whole-word match of any term inside a location. */
export const mentions = (location: string, terms: string[]) => {
  const loc = norm(location);
  return terms.some((t) => { const n = norm(t); return n !== "" && new RegExp(`(^|[^a-z0-9])${escape(n)}([^a-z0-9]|$)`).test(loc); });
};

export const termsFor = (p: Pick<Place, "id" | "name">, extra: string[] = []) => [p.name, ...(ALIASES[p.id] ?? []), ...extra];

/** Slugs of the projects whose Location mentions the place (name, a known variant, or a variant added in Site settings). */
export const projectsAt = (p: Pick<Place, "id" | "name">, projects: { slug: string; location?: string }[], extra: string[] = []) => {
  const t = termsFor(p, extra);
  return projects.filter((x) => x.location && mentions(x.location, t)).map((x) => x.slug);
};
