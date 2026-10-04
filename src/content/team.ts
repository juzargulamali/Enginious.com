// People named in Company Profile 2026 Q2. NOTHING here is approved for publication:
// names, titles and portraits must be confirmed by each person. No portraits are used;
// every card renders a clearly marked placeholder until real photography is supplied.

export type Dept = "leadership" | "engineering" | "creative" | "software" | "delivery" | "business";

export const DEPTS: { key: Dept | "all"; label: string }[] = [
  { key: "all", label: "All people" },
  { key: "leadership", label: "Leadership" },
  { key: "engineering", label: "Engineering" },
  { key: "creative", label: "Creative" },
  { key: "software", label: "Software" },
  { key: "delivery", label: "Delivery" },
  { key: "business", label: "Business" },
];

export interface Person {
  id: string;
  name: string;
  role: string;
  dept: Dept;
}

export const PEOPLE: Person[] = [
  { id: "juzar-gulamali", name: "Juzar Gulamali", role: "Founder & CEO", dept: "leadership" },
  { id: "rafi-ullah", name: "Rafi Ullah", role: "Co-founder & CTO", dept: "leadership" },
  { id: "syed-tibyan", name: "Syed Tibyan", role: "Lead Mechatronic Engineer", dept: "engineering" },
  { id: "nalim-mohamed", name: "Nalim Mohamed", role: "Design Engineer", dept: "engineering" },
  { id: "ghulam-muhaiyo", name: "Ghulam Muhaiyo", role: "Lead Technician", dept: "engineering" },
  { id: "azhar-iqbal", name: "Azhar Iqbal", role: "Technician", dept: "engineering" },
  { id: "mazhar-waqas", name: "Mazhar Waqas", role: "Warehouse / Technician", dept: "engineering" },
  { id: "zainab-jebur", name: "Zainab Jebur", role: "Creative Director", dept: "creative" },
  { id: "dawood-ishtiaq", name: "Dawood Ishtiaq", role: "Lead Design Director", dept: "creative" },
  { id: "trupti-mahajan", name: "Trupti Mahajan", role: "3D / Multimedia Designer", dept: "creative" },
  { id: "jowin-raj", name: "Jowin Raj", role: "3D / Multimedia Designer", dept: "creative" },
  { id: "ashwin-kailas", name: "Ashwin Kailas", role: "Head of Programming", dept: "software" },
  { id: "aqeel-aman-ali", name: "Aqeel Aman Ali", role: "Unity Developer", dept: "software" },
  { id: "priyansh-aleti", name: "Priyansh Aleti", role: "Unity Developer", dept: "software" },
  { id: "hanif-ullah", name: "Hanif Ullah", role: "Operations Director", dept: "delivery" },
  { id: "ben-mendis", name: "Ben Mendis", role: "Project Manager", dept: "delivery" },
  { id: "moiz-hussain", name: "Moiz Hussain", role: "Project Manager", dept: "delivery" },
  { id: "saeed-siddique", name: "Saeed Siddique", role: "Admin & Operations", dept: "delivery" },
  { id: "lubna", name: "Lubna", role: "KSA Director", dept: "business" },
  { id: "tasneem-shahana", name: "Tasneem Shahana", role: "Sales Manager", dept: "business" },
  { id: "dennis-joseph", name: "Dennis Joseph", role: "Sales & Marketing Manager", dept: "business" },
  { id: "aswathi-js", name: "Aswathi J S", role: "Marketing Executive", dept: "business" },
  { id: "gulalai-ismail", name: "Gulalai Ismail", role: "CFO", dept: "business" },
];

// Generic, role-level blurbs used until each person's own introduction is supplied.
export const DEPT_BLURB: Record<Dept, string> = {
  leadership: "Sets direction for Enginious across Dubai, Saudi Arabia and Europe.",
  engineering: "Connects mechanics, electronics and digital content so installations work on the show floor.",
  creative: "Shapes the stories, visuals and 2D/3D content that run on every screen.",
  software: "Builds the interactive applications and logic behind each experience.",
  delivery: "Plans, coordinates and supports projects from brief through installation.",
  business: "Is your first point of contact for projects, partnerships and regional enquiries.",
};

/** DRAFT leadership messages for review. Never publish as approved statements. */
export const LEADER_DRAFTS: Record<string, { responsibilities: string; message: string }> = {
  "juzar-gulamali": {
    responsibilities: "To be confirmed.",
    message:
      "We bring engineers and creative minds into one team, so that ambitious ideas become experiences people remember.",
  },
  "rafi-ullah": {
    responsibilities: "To be confirmed.",
    message:
      "We bring creativity and engineering together, so that what we design also works reliably in the room.",
  },
};
