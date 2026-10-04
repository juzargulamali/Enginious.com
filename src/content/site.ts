// Site-wide configuration. Moves into the CMS (office_contacts, navigation) in a later milestone.

export const NAV = [
  { href: "/work", label: "Work" },
  { href: "/technologies", label: "Technologies" },
  { href: "/solutions", label: "Solutions" },
  { href: "/company", label: "Company" },
  { href: "/company/team", label: "Team" },
  { href: "/insights", label: "Insights" },
] as const;

export const REGION_NAV = [
  { href: "/uae", label: "UAE" },
  { href: "/saudi-arabia", label: "Saudi Arabia" },
  { href: "/europe", label: "Europe" },
] as const;

export type RegionKey = "uae" | "ksa" | "europe";

export interface Region {
  key: RegionKey;
  name: string;
  role: string;
  /** Contact details confirmed from supplied material. Null = not yet supplied. */
  email: string | null;
  phone: string | null;
  city: string | null;
  href: string;
}

export const REGIONS: Record<RegionKey, Region> = {
  uae: {
    key: "uae",
    name: "Dubai",
    role: "Global headquarters",
    email: "info@enginious.ae",
    phone: "+971 4 251 5127",
    city: "Dubai, UAE",
    href: "/uae",
  },
  ksa: {
    key: "ksa",
    name: "Saudi Arabia",
    role: "Branch",
    email: "lubna@enginious.ae",
    phone: "+966 56 861 8876",
    city: "Riyadh, KSA",
    href: "/saudi-arabia",
  },
  europe: {
    key: "europe",
    name: "Poland",
    role: "Branch serving Europe",
    // Not supplied: enquiries from Europe fall back to the general contact.
    email: null,
    phone: null,
    city: null,
    href: "/europe",
  },
};

export const GENERAL_CONTACT = { email: "info@enginious.ae", phone: "+971 4 251 5127" };

export const PROJECT_TYPES = [
  { value: "event", label: "Event or exhibition" },
  { value: "permanent", label: "Permanent installation" },
  { value: "other", label: "Something else" },
] as const;

export const BUDGETS = [
  { value: "under-50k", label: "Under USD 50k" },
  { value: "50-150k", label: "USD 50k – 150k" },
  { value: "150-500k", label: "USD 150k – 500k" },
  { value: "over-500k", label: "Over USD 500k" },
  { value: "unsure", label: "Not sure yet" },
] as const;

export const SERVICES = [
  {
    title: "Events, exhibitions & activations",
    body: "Experiential technology and content for stands, roadshows and brand moments.",
    href: "/solutions",
  },
  {
    title: "Experience centres & permanent installations",
    body: "Immersive spaces tailored to your needs, from centres to studios and offices.",
    href: "/solutions",
  },
  {
    title: "Interactive software & content",
    body: "Unity/Unreal applications and 2D/3D content built for the screens in the room.",
    href: "/solutions",
  },
  {
    title: "Engineering & integration",
    body: "Mechatronics, product design and hardware/software integration, concept to production.",
    href: "/technologies",
  },
  {
    title: "Operation & maintenance",
    body: "After-sales support and dedicated maintenance contracts for installed technology.",
    href: "/solutions",
  },
] as const;
