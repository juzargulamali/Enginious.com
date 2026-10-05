// Technology inventory. Descriptions paraphrase the Company Profile 2026 Q2.
// No specifications, dimensions, availability or lead times are stated: none are confirmed.

export type TechCategory = "kinetic" | "interactive" | "immersive" | "ai" | "robotics";

export const TECH_CATEGORIES: { key: TechCategory; label: string; blurb: string }[] = [
  { key: "kinetic", label: "Kinetic", blurb: "Screens and structures that move with the story." },
  { key: "interactive", label: "Interactive", blurb: "Touch, presence and gesture that put visitors in control." },
  { key: "immersive", label: "Immersive", blurb: "Rooms, tunnels and volumes that surround an audience." },
  { key: "ai", label: "AI", blurb: "Photobooths, assistants and camera systems with intelligence built in." },
  { key: "robotics", label: "Robotics", blurb: "Robotic arms and robots integrated into the experience." },
];

export interface Technology {
  slug: string;
  name: string;
  category: TechCategory;
  summary: string;
  /** Project slugs where the profile records this technology in use. */
  projects: string[];
  /** Full page exists. Others are listed with a "page in preparation" state. */
  detailed?: boolean;
  /** CMS-only fields. */
  description?: string;
  useCases?: string[];
  specs?: { label: string; value: string }[];
  media?: string[];
  /** CMS media id of a transparent-background image shown in the homepage showroom instead of the line drawing. */
  showcaseImage?: string;
  featured?: boolean;
  seo?: import("@/lib/content/types").SeoFields;
}

export const TECHNOLOGIES: Technology[] = [
  {
    slug: "tri-helix",
    name: "Tri-Helix",
    category: "kinetic",
    summary:
      "Rotating triangular screens that stack and turn 360 degrees, forming shapes such as hexagons and cylinders, or joining into an LED wall.",
    projects: ["dubai-air-show", "cityscape", "leap", "global-health-exhibition", "iktva"],
    detailed: true,
  },
  {
    slug: "arc-shift",
    name: "Arc Shift",
    category: "kinetic",
    summary: "A kinetic display creating curved, motion-driven visual transitions.",
    projects: ["whx", "cityscape"],
  },
  {
    slug: "arc-revolve",
    name: "Arc Revolve",
    category: "kinetic",
    summary: "A kinetic display, delivered at the Global Health Exhibition.",
    projects: ["global-health-exhibition"],
  },
  {
    slug: "dna-xs",
    name: "DNA XS",
    category: "kinetic",
    summary: "A display featuring rotating visual elements for dynamic storytelling.",
    projects: ["whx"],
  },
  {
    slug: "triaxis",
    name: "TriAxis Display",
    category: "kinetic",
    summary: "A rotating triangular screen system presenting dynamic content.",
    projects: ["world-defense-show"],
  },
  {
    slug: "sliding-screen",
    name: "Sliding Screen",
    category: "kinetic",
    summary: "A moving-screen interface for guided, dynamic content navigation.",
    projects: ["ifat", "gitex", "leap", "global-health-exhibition"],
  },
  {
    slug: "kinetic-wall-ceiling",
    name: "Kinetic Wall & Ceiling",
    category: "kinetic",
    summary: "Synchronised kinetic surfaces carrying wave-like content through a space.",
    projects: ["money-20-20", "leap", "atm"],
  },
  {
    slug: "touch-and-throw",
    name: "Touch & Throw",
    category: "interactive",
    summary: "Browse on a touchscreen, then swipe to throw content onto a larger display.",
    projects: ["umrah-ziyarah-forum", "cityscape", "cop30", "global-health-exhibition"],
  },
  {
    slug: "circular-dial",
    name: "Circular Dial Interface",
    category: "interactive",
    summary: "A rotary control that drives 3D visuals and data on a synchronised main display.",
    projects: ["idex", "cop30"],
  },
  {
    slug: "transparent-oled",
    name: "Transparent OLED",
    category: "interactive",
    summary: "A 30-inch transparent OLED used for touch exploration and layered content.",
    projects: ["atm", "arab-health", "iktva"],
  },
  {
    slug: "interactive-wall",
    name: "Interactive Wall",
    category: "interactive",
    summary: "Gesture-based, motion-responsive wall graphics and timelines.",
    projects: ["hajj-umrah-exhibition"],
  },
  {
    slug: "interactive-games",
    name: "Interactive Games",
    category: "interactive",
    summary: "Mind-controlled slot car racing, laser maze, reflex and sports challenges.",
    projects: ["f1-jeddah", "games-of-the-future", "f1-etihad"],
  },
  {
    slug: "immersive-room",
    name: "Immersive Room & Tunnel",
    category: "immersive",
    summary: "Surround visuals, sound and spatial design in a room or walk-through tunnel.",
    projects: ["world-future-energy-summit", "aldar-wilds", "chronicles-ahmed-al-maghribi", "dubai-air-show"],
  },
  {
    slug: "holofan",
    name: "HoloFan Display",
    category: "immersive",
    summary: "Fan-based displays producing floating, hologram-style visuals.",
    projects: ["leap", "global-health-exhibition"],
  },
  {
    slug: "holotube",
    name: "RFID Holotube",
    category: "immersive",
    summary: "RFID-enabled Holotube experiences.",
    projects: ["global-health-exhibition"],
  },
  {
    slug: "ar-vr",
    name: "AR / VR Experiences",
    category: "immersive",
    summary: "Augmented and virtual reality, from AR tabletops to VR sports simulations.",
    projects: ["invest-qatar", "fifa-arab-cup", "games-of-the-future"],
  },
  {
    slug: "ai-photobooth",
    name: "AI Photobooth",
    category: "ai",
    summary: "Branded AI photobooths delivered at sports and healthcare events.",
    projects: ["f1-etihad", "fifa-arab-cup", "arab-health"],
  },
  {
    slug: "ai-assistant",
    name: "AI Assistant",
    category: "ai",
    summary: "A lifelike, voice-based assistant that explains content as options are chosen.",
    projects: ["invest-qatar", "cityscape"],
  },
  {
    slug: "ai-camera-tracking",
    name: "AI Camera Tracking",
    category: "ai",
    summary: "Camera systems for visitor tracking and presence-triggered content.",
    projects: ["global-health-exhibition"],
  },
  {
    slug: "robotic-arm",
    name: "Robotic Arm Experiences",
    category: "robotics",
    summary: "Robotic arms integrated with interactive screens and custom tasks.",
    projects: ["chronicles-ahmed-al-maghribi", "cityscape", "global-health-exhibition"],
  },
];

export const techBySlug = (slug: string) => TECHNOLOGIES.find((t) => t.slug === slug);
