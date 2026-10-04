// Offices and delivered-project locations. Locations come from the owner's list; related work is shown ONLY where the
// company profile records that place. Country-level entries (Bahrain, Kuwait, Brazil, Poland) are not given a city.

export type OfficeRole = "hq" | "branch";

export interface Place {
  id: string; // matches scripts/build-map.mjs
  name: string;
  country: string;
  precision: "city" | "country";
  office?: { role: OfficeRole; label: string; region: "uae" | "ksa" | "europe"; note?: string };
  project?: boolean;
  /** Project slugs recorded for this place. */
  related?: string[];
  /** Shown beside related work when the profile records the place at a different level (e.g. "Qatar"). */
  relatedNote?: string;
  group: "gulf" | "europe" | "world";
}

export const PLACES_DATA: Place[] = [
  { id: "dubai", name: "Dubai", country: "UAE", precision: "city", office: { role: "hq", label: "Global Headquarters", region: "uae" }, project: true, group: "gulf", related: ["whx", "dubai-air-show", "chronicles-ahmed-al-maghribi", "gitex", "atm", "arab-health", "aldar-wilds"] },
  { id: "riyadh", name: "Riyadh", country: "Saudi Arabia", precision: "city", office: { role: "branch", label: "Saudi Arabia Branch", region: "ksa" }, project: true, group: "gulf", related: ["global-health-exhibition", "cityscape", "leap", "money-20-20", "world-defense-show", "ifat", "restatex", "hajj-umrah-exhibition", "iktva"] },
  { id: "poland", name: "Poland", country: "Poland", precision: "country", office: { role: "branch", label: "Branch serving Europe", region: "europe", note: "Country-level marker: the branch city is not shown yet." }, group: "europe" },
  { id: "abu-dhabi", name: "Abu Dhabi", country: "UAE", precision: "city", project: true, group: "gulf", related: ["f1-etihad", "world-future-energy-summit", "idex", "fahid-island"] },
  { id: "jeddah", name: "Jeddah", country: "Saudi Arabia", precision: "city", project: true, group: "gulf", related: ["f1-jeddah"] },
  { id: "doha", name: "Doha", country: "Qatar", precision: "city", project: true, group: "gulf", related: ["invest-qatar", "fifa-arab-cup"], relatedNote: "Recorded for Qatar in our project list." },
  { id: "muscat", name: "Muscat", country: "Oman", precision: "city", project: true, group: "gulf", related: ["fifa-arab-cup"], relatedNote: "Recorded for Oman in our project list." },
  { id: "bahrain", name: "Bahrain", country: "Bahrain", precision: "country", project: true, group: "gulf", related: ["fifa-arab-cup"], relatedNote: "Recorded for Bahrain in our project list." },
  { id: "kuwait", name: "Kuwait", country: "Kuwait", precision: "country", project: true, group: "gulf" },
  { id: "baku", name: "Baku", country: "Azerbaijan", precision: "city", project: true, group: "world" },
  { id: "hannover", name: "Hannover", country: "Germany", precision: "city", project: true, group: "europe" },
  { id: "vienna", name: "Vienna", country: "Austria", precision: "city", project: true, group: "europe" },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", precision: "city", project: true, group: "europe" },
  { id: "barcelona", name: "Barcelona", country: "Spain", precision: "city", project: true, group: "europe" },
  { id: "paris", name: "Paris", country: "France", precision: "city", project: true, group: "europe" },
  { id: "london", name: "London", country: "United Kingdom", precision: "city", project: true, group: "europe" },
  { id: "miami", name: "Miami", country: "United States", precision: "city", project: true, group: "world" },
  { id: "las-vegas", name: "Las Vegas", country: "United States", precision: "city", project: true, group: "world" },
  { id: "brazil", name: "Brazil", country: "Brazil", precision: "country", project: true, group: "world", related: ["cop30"], relatedNote: "COP30 took place in Belém." },
  { id: "shanghai", name: "Shanghai", country: "China", precision: "city", project: true, group: "world" },
];

export const OFFICES = PLACES_DATA.filter((p) => p.office);
export const PROJECT_PLACES = PLACES_DATA.filter((p) => p.project);
