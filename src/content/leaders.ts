// Leadership detail. DRAFT responsibilities are derived only from the role titles in the company profile and need
// approval (tracked in docs/content-todo.md). A message is shown publicly ONLY when `approved` is true.
export interface LeaderInfo {
  photo?: string; // image id in src/content/images.ts
  responsibilities: string[];
  /** Shown publicly ONLY when approved is true. Drafts for approval are in docs/leadership-drafts.md. */
  message?: string;
  approved: boolean;
  bio?: string;
}

export const LEADERS: Record<string, LeaderInfo> = {
  "juzar-gulamali": {
    photo: "juzar-gulamali",
    responsibilities: ["Company direction and leadership of Enginious", "Clients, partners and the Dubai, Saudi Arabia and Europe teams"],
    approved: false,
  },
  "rafi-ullah": {
    responsibilities: ["Technology and engineering direction", "Mechatronics, software and integration across projects"],
    approved: false,
  },
};
