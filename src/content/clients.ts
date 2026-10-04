// Clients named in the Company Profile 2026 Q2, linked to the projects they appear on.
// NO logos are included: none were supplied, and logos are never generated or approximated. When an approved logo file is
// registered (src/content/images.ts) and its id set in `logo`, it is shown at its natural proportions.
// `relationship` is "unconfirmed" until the owner confirms whether each is a direct client or an agency partner;
// the UI only shows the direct/agency distinction for entries whose relationship is confirmed.

export type Relationship = "direct" | "agency" | "unconfirmed";

export interface Client {
  id: string;
  name: string;
  relationship: Relationship;
  /** Image id of an approved logo (src/content/images.ts). Omit until supplied. */
  logo?: string;
  projects: string[];
}

export const CLIENTS: Client[] = [
  { id: "american-hospital", name: "American Hospital", relationship: "unconfirmed", projects: ["whx"] },
  { id: "sami", name: "SAMI", relationship: "unconfirmed", projects: ["world-defense-show"] },
  { id: "mwan", name: "MWAN", relationship: "unconfirmed", projects: ["ifat"] },
  { id: "uae-mocae", name: "UAE Ministry of Climate Change and Environment", relationship: "unconfirmed", projects: ["world-future-energy-summit"] },
  { id: "etihad", name: "Etihad Airways", relationship: "unconfirmed", projects: ["f1-etihad"] },
  { id: "aramco", name: "Aramco", relationship: "unconfirmed", projects: ["iktva"] },
  { id: "aldar", name: "Aldar", relationship: "unconfirmed", projects: ["fahid-island", "aldar-wilds"] },
  { id: "stc", name: "stc", relationship: "unconfirmed", projects: ["f1-jeddah"] },
  { id: "riyadh-air", name: "Riyadh Air", relationship: "unconfirmed", projects: ["atm"] },
  { id: "visit-saudi", name: "Visit Saudi", relationship: "unconfirmed", projects: ["atm"] },
  { id: "elm", name: "ELM", relationship: "unconfirmed", projects: ["money-20-20"] },
  { id: "ejada", name: "Ejada", relationship: "unconfirmed", projects: ["money-20-20", "global-health-exhibition"] },
  { id: "rega", name: "REGA", relationship: "unconfirmed", projects: ["restatex"] },
  { id: "tamkeen", name: "Tamkeen", relationship: "unconfirmed", projects: ["leap"] },
  { id: "tawuniya", name: "Tawuniya", relationship: "unconfirmed", projects: ["leap"] },
  { id: "iq-real-estate", name: "IQ Real Estate", relationship: "unconfirmed", projects: ["cityscape"] },
  { id: "hail-municipality", name: "Hail Region Municipality", relationship: "unconfirmed", projects: ["cityscape"] },
  { id: "gal", name: "GAL", relationship: "unconfirmed", projects: ["dubai-air-show"] },
  { id: "ammroc", name: "AMMROC", relationship: "unconfirmed", projects: ["dubai-air-show"] },
  { id: "mro", name: "MRO", relationship: "unconfirmed", projects: ["dubai-air-show"] },
  { id: "cmn-naval", name: "CMN Naval", relationship: "unconfirmed", projects: ["idex"] },
  { id: "gba", name: "Global Biofuels Alliance", relationship: "unconfirmed", projects: ["cop30"] },
  { id: "ge-healthcare", name: "GE Healthcare", relationship: "unconfirmed", projects: ["arab-health"] },
  { id: "purehealth", name: "PureHealth", relationship: "unconfirmed", projects: ["arab-health"] },
  { id: "nupco", name: "NUPCO", relationship: "unconfirmed", projects: ["global-health-exhibition"] },
  { id: "sulaiman-al-habib", name: "Sulaiman Al Habib", relationship: "unconfirmed", projects: ["global-health-exhibition"] },
  { id: "mouwasat", name: "Mouwasat", relationship: "unconfirmed", projects: ["global-health-exhibition"] },
  { id: "saudi-post", name: "Saudi Post", relationship: "unconfirmed", projects: ["global-health-exhibition"] },
  { id: "go-telecom", name: "GO Telecom", relationship: "unconfirmed", projects: ["global-health-exhibition"] },
  { id: "saudi-german-health", name: "Saudi German Health", relationship: "unconfirmed", projects: ["global-health-exhibition"] },
  { id: "baxter", name: "Baxter", relationship: "unconfirmed", projects: ["global-health-exhibition"] },
  { id: "cloudflare", name: "Cloudflare", relationship: "unconfirmed", projects: ["gitex"] },
  { id: "aws", name: "AWS", relationship: "unconfirmed", projects: ["gitex"] },
  { id: "honeywell", name: "Honeywell", relationship: "unconfirmed", projects: ["gitex"] },
  { id: "pure-storage", name: "Pure Storage", relationship: "unconfirmed", projects: ["gitex"] },
];

export const clientById = (id: string) => CLIENTS.find((c) => c.id === id);
export const hasConfirmedRelationships = CLIENTS.some((c) => c.relationship !== "unconfirmed");
