// The content model. Pure data + small helpers (no server-only imports) so the admin editor and the server share it.
import { parseVideoUrl } from "../video.ts";
// Every content item is a row in public.content_items: title + slug + a `draft` JSON object whose shape is defined here.
// Keys that start with "_" are internal (approval flags, notes); the database strips them from the public snapshot.

export const CONTENT_TYPES = [
  "project", "technology", "solution", "company_section", "person", "region", "client", "testimonial", "article", "role", "faq", "setting", "page_seo",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export type FieldType =
  | "text" | "textarea" | "markdown" | "number" | "boolean" | "select" | "multiselect" | "date" | "url" | "email"
  | "media" | "mediaList" | "ref" | "refs" | "strings" | "records";

export interface Option { value: string; label: string }

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  /** Required to PUBLISH (saving a draft may leave it empty). */
  required?: boolean;
  /** Text length, or the largest allowed value for a number. */
  max?: number;
  /** Smallest allowed value for a number. */
  min?: number;
  /** A video address: YouTube or a direct https video file (validated by parseVideoUrl). */
  video?: boolean | "file";
  options?: Option[];
  refType?: ContentType;
  mediaKind?: "image" | "logo" | "document";
  fields?: Field[]; // for records
  /** Shown only to staff, never public (key must start with "_"). */
  internal?: boolean;
  group?: string;
}

export interface TypeDef {
  type: ContentType;
  label: string;
  plural: string;
  description: string;
  titleLabel: string;
  fields: Field[];
  /** Public URL of an item (null = not a page of its own). */
  path: ((slug: string) => string) | null;
  orderable: boolean;
  featurable: boolean;
  /** Fixed set of slugs managed by the system (settings, page SEO): no new slugs. */
  fixedSlugs?: string[];
  /** Columns shown in the list besides title/status. */
  listKeys?: string[];
  seo?: boolean;
}

const seo = (): Field[] => [
  { key: "seo_title", label: "Search title", type: "text", max: 70, group: "Search and sharing", help: "Optional. Leave empty to use the page title. Around 50 to 60 characters works best." },
  { key: "seo_description", label: "Search description", type: "textarea", max: 170, group: "Search and sharing", help: "Optional. One or two plain sentences, up to about 160 characters." },
  { key: "seo_image", label: "Sharing image", type: "media", mediaKind: "image", group: "Search and sharing", help: "Shown when the page is shared. Landscape, ideally 1200 x 630." },
  { key: "seo_canonical", label: "Canonical path override", type: "text", max: 200, group: "Search and sharing", placeholder: "/work/example", help: "Rarely needed. Must start with / and point at another page of this site." },
  { key: "seo_noindex", label: "Hide from search engines", type: "boolean", group: "Search and sharing", help: "Keeps this page out of the sitemap and adds a noindex tag, even after launch." },
];

const REGION_OPTS: Option[] = [{ value: "uae", label: "UAE" }, { value: "ksa", label: "Saudi Arabia" }, { value: "international", label: "International" }];
export const TECH_CATEGORY_OPTS: Option[] = [
  { value: "kinetic", label: "Kinetic" }, { value: "interactive", label: "Interactive" }, { value: "immersive", label: "Immersive" },
  { value: "ai", label: "AI" }, { value: "robotics", label: "Robotics" },
];
export const DEPT_OPTS: Option[] = [
  { value: "leadership", label: "Leadership" }, { value: "engineering", label: "Engineering" }, { value: "creative", label: "Creative" },
  { value: "software", label: "Software" }, { value: "delivery", label: "Delivery" }, { value: "business", label: "Business" },
];
const RELATIONSHIP_OPTS: Option[] = [
  { value: "unconfirmed", label: "Not confirmed (name only)" }, { value: "direct", label: "Direct client" }, { value: "agency", label: "Delivered through an agency" },
];

export const TYPE_DEFS: Record<ContentType, TypeDef> = {
  project: {
    type: "project", label: "Project", plural: "Projects and case studies", titleLabel: "Project title",
    description: "Delivered projects. Appears on Work, the homepage reel, technology pages and the map.",
    path: (s) => `/work/${s}`, orderable: true, featurable: true, seo: true, listKeys: ["client", "year"],
    fields: [
      { key: "client", label: "Client (as shown)", type: "text", max: 160, group: "Basics", help: "Exactly as the client may be named publicly." },
      { key: "client_attribution", label: "Approved attribution wording", type: "text", max: 200, group: "Basics", placeholder: "Delivered for X through agency Y", help: "Use only wording the client has approved. Leave empty if unconfirmed." },
      { key: "_attribution_approved", label: "Attribution approved by the client", type: "boolean", internal: true, group: "Basics", help: "Internal. Not shown publicly." },
      { key: "event", label: "Event or venue", type: "text", max: 160, group: "Basics" },
      { key: "location", label: "Location", type: "text", max: 120, group: "Basics", placeholder: "Dubai, UAE" },
      { key: "region", label: "Region", type: "select", options: REGION_OPTS, group: "Basics" },
      { key: "year", label: "Year", type: "number", group: "Basics" },
      { key: "sector", label: "Sector", type: "text", max: 80, group: "Basics" },
      { key: "summary", label: "Summary", type: "textarea", required: true, max: 400, group: "Story", help: "One or two plain sentences." },
      { key: "challenge", label: "Challenge", type: "markdown", group: "Story" },
      { key: "experience", label: "The experience", type: "markdown", group: "Story" },
      { key: "technologies", label: "Technologies used", type: "refs", refType: "technology", group: "Links" },
      { key: "case_study", label: "Has a full case-study page", type: "boolean", group: "Links" },
      { key: "video_url", label: "Main video (YouTube link or direct video file)", type: "url", video: true, group: "Video", help: "One link used for both the card preview and the full player on the page. YouTube (public or unlisted) or a direct https link to a .mp4 / .webm file. SharePoint, OneDrive and Google Drive sharing pages do not work. Leave empty for no video." },
      { key: "video_preview_start", label: "Card preview start (seconds)", type: "number", min: 0, max: 36000, group: "Video", help: "Where the card preview begins. Default 0. The full player is not affected." },
      { key: "video_preview_seconds", label: "Card preview length (seconds)", type: "number", min: 3, max: 60, group: "Video", help: "How long the preview plays before it repeats. Default 10. Note: this limits what is shown, not what the browser may download." },
      { key: "video_poster", label: "Video poster image", type: "media", mediaKind: "image", group: "Video", help: "Optional. Shown before play. If empty, the first project/technology image is used, then the YouTube thumbnail." },
      { key: "video_preview_url", label: "Separate preview video (advanced, optional)", type: "url", video: "file", group: "Video", help: "Optional. A short direct video file used only for the card preview (never required)." },
      { key: "media", label: "Project media", type: "mediaList", mediaKind: "image", group: "Media", help: "Only authentic project media. Concepts and previews are labelled as such." },
      { key: "outcomes", label: "Verified outcomes", type: "records", group: "Outcomes", help: "Only results the client has confirmed. An outcome must be marked verified to publish.",
        fields: [
          { key: "label", label: "Outcome", type: "text", max: 120 },
          { key: "value", label: "Result", type: "text", max: 120 },
          { key: "source", label: "Source or confirmation", type: "text", max: 160 },
          { key: "verified", label: "Verified", type: "boolean" },
        ] },
      ...seo(),
    ],
  },
  technology: {
    type: "technology", label: "Technology", plural: "Technologies", titleLabel: "Technology name",
    description: "The technologies Enginious builds. Appears in the showroom, on technology pages and in enquiries.",
    path: (s) => `/technologies/${s}`, orderable: true, featurable: true, seo: true, listKeys: ["category"],
    fields: [
      { key: "category", label: "Category", type: "select", required: true, options: TECH_CATEGORY_OPTS, group: "Basics" },
      { key: "summary", label: "Summary", type: "textarea", required: true, max: 400, group: "Basics" },
      { key: "detailed", label: "Has a full page", type: "boolean", group: "Basics", help: "Turn on only when the page has enough approved content." },
      { key: "description", label: "Description", type: "markdown", group: "Content" },
      { key: "use_cases", label: "Use cases", type: "strings", group: "Content" },
      { key: "specs", label: "Confirmed specifications", type: "records", group: "Content", help: "Only specifications Enginious has confirmed. Each must be marked confirmed to publish.",
        fields: [
          { key: "label", label: "Specification", type: "text", max: 80 },
          { key: "value", label: "Value", type: "text", max: 120 },
          { key: "confirmed", label: "Confirmed", type: "boolean" },
        ] },
      { key: "projects", label: "Related projects", type: "refs", refType: "project", group: "Links" },
      { key: "showcase_image", label: "Showroom image (transparent background)", type: "media", mediaKind: "image", group: "Showroom", help: "The resting pose, shown in the homepage showroom in place of the line drawing. PNG or WebP with a transparent background, the product only, about 1200 px wide with a little empty space around it. Leave empty to keep the line drawing." },
      { key: "showcase_animation", label: "Showroom animation (optional, transparent animated WebP)", type: "media", mediaKind: "image", group: "Showroom", help: "Optional. Plays only while this technology is the selected one in the centre; neighbours and reduced-motion visitors see the resting pose. Animated WebP only (not GIF or APNG), same framing as the resting image, up to 4 MB uploaded, 1200 px wide, 240 frames, 3.5 MB after processing. It loops for as long as the exhibit stays selected; it cannot hold the last frame or play backwards." },
      { key: "showcase_scale", label: "Showroom size (%)", type: "number", min: 50, max: 150, group: "Showroom", help: "Optional. 100 is the default. The same value is used for the resting image and the animation, so switching never jumps." },
      { key: "showcase_y", label: "Showroom height offset (%)", type: "number", min: -20, max: 20, group: "Showroom", help: "Optional. Moves the product up (positive) or down (negative) on its podium. 0 is the default." },
      { key: "video_url", label: "Main video (YouTube link or direct video file)", type: "url", video: true, group: "Video", help: "One link used for both the card preview and the full player on the page. YouTube (public or unlisted) or a direct https link to a .mp4 / .webm file. SharePoint, OneDrive and Google Drive sharing pages do not work. Leave empty for no video." },
      { key: "video_preview_start", label: "Card preview start (seconds)", type: "number", min: 0, max: 36000, group: "Video", help: "Where the card preview begins. Default 0. The full player is not affected." },
      { key: "video_preview_seconds", label: "Card preview length (seconds)", type: "number", min: 3, max: 60, group: "Video", help: "How long the preview plays before it repeats. Default 10. Note: this limits what is shown, not what the browser may download." },
      { key: "video_poster", label: "Video poster image", type: "media", mediaKind: "image", group: "Video", help: "Optional. Shown before play. If empty, the first project/technology image is used, then the YouTube thumbnail." },
      { key: "video_preview_url", label: "Separate preview video (advanced, optional)", type: "url", video: "file", group: "Video", help: "Optional. A short direct video file used only for the card preview (never required)." },
      { key: "media", label: "Media", type: "mediaList", mediaKind: "image", group: "Media" },
      ...seo(),
    ],
  },
  solution: {
    type: "solution", label: "Solution", plural: "Solutions and services", titleLabel: "Service name",
    description: "What clients can commission. Appears on the Solutions page.",
    path: null, orderable: true, featurable: true, seo: false, listKeys: [],
    fields: [
      { key: "summary", label: "Summary", type: "textarea", required: true, max: 400, group: "Basics" },
      { key: "body", label: "Description", type: "markdown", group: "Basics" },
      { key: "benefits", label: "Benefits", type: "strings", group: "Content" },
      { key: "process", label: "Process", type: "records", group: "Content", fields: [{ key: "title", label: "Step", type: "text", max: 80 }, { key: "body", label: "What happens", type: "textarea", max: 300 }] },
      { key: "technologies", label: "Related technologies", type: "refs", refType: "technology", group: "Links" },
      { key: "projects", label: "Related projects", type: "refs", refType: "project", group: "Links" },
      { key: "media", label: "Media", type: "mediaList", mediaKind: "image", group: "Media" },
    ],
  },
  company_section: {
    type: "company_section", label: "Company section", plural: "Company story, mission, vision and process", titleLabel: "Heading",
    description: "Text blocks on the Company page: story, mission, vision and process.",
    path: null, orderable: true, featurable: false, seo: false,
    fields: [
      { key: "body", label: "Text", type: "markdown", required: true, group: "Content" },
      { key: "steps", label: "Steps (for the process section)", type: "records", group: "Content", fields: [{ key: "title", label: "Step", type: "text", max: 60 }, { key: "body", label: "What happens", type: "textarea", max: 200 }] },
      { key: "_note", label: "Internal note", type: "textarea", internal: true, group: "Content" },
    ],
  },
  person: {
    type: "person", label: "Person", plural: "People", titleLabel: "Full name",
    description: "Team members. Appears in the team gallery, on the Company page and in leadership.",
    path: null, orderable: true, featurable: true, seo: false, listKeys: ["role", "department"],
    fields: [
      { key: "role", label: "Role", type: "text", required: true, max: 120, group: "Basics" },
      { key: "department", label: "Department", type: "select", required: true, options: DEPT_OPTS, group: "Basics" },
      { key: "leadership", label: "Leadership team", type: "boolean", group: "Basics" },
      { key: "portrait", label: "Portrait", type: "media", mediaKind: "image", group: "Basics", help: "Real, supplied photographs only. Preview portraits are labelled as previews." },
      { key: "bio", label: "Biography", type: "markdown", group: "Profile" },
      { key: "responsibilities", label: "Responsibilities", type: "strings", group: "Profile" },
      { key: "message", label: "Message (leadership)", type: "markdown", group: "Leadership message", help: "Stays private until you tick approval below." },
      { key: "_message_approved", label: "Message approved by this person", type: "boolean", internal: true, group: "Leadership message", help: "Internal. The message is published only when this is ticked." },
    ],
  },
  region: {
    type: "region", label: "Region", plural: "Regions and offices", titleLabel: "Office name",
    description: "Dubai headquarters, Riyadh branch and Poland serving Europe. Slugs are fixed: uae, ksa, europe.",
    path: null, orderable: true, featurable: false, seo: false, fixedSlugs: ["uae", "ksa", "europe"], listKeys: ["role_label"],
    fields: [
      { key: "role_label", label: "Role", type: "text", required: true, max: 80, group: "Basics", placeholder: "Global headquarters" },
      { key: "city", label: "City", type: "text", max: 80, group: "Basics", help: "Leave empty until the city is confirmed." },
      { key: "intro", label: "Introduction", type: "markdown", group: "Basics" },
      { key: "card_title", label: "Contact card title", type: "text", max: 60, group: "Contact card", placeholder: "Riyadh", help: "Optional. The name shown on this office's card on the Contact page. Empty uses the built-in text." },
      { key: "card_subtitle", label: "Contact card subtitle", type: "text", max: 80, group: "Contact card", placeholder: "Saudi Arabia Branch", help: "Optional. Empty uses the built-in text." },
      { key: "card_image", label: "Contact card photograph", type: "media", mediaKind: "image", group: "Contact card", help: "A landscape photograph (about 3:2, 1800 px wide or more; the original is kept). Set the focal point in the Media library so the landmark stays in frame. Alt text is edited there too. Empty keeps the built-in photograph." },
      { key: "email", label: "Contact email", type: "email", group: "Contact", help: "Confirmed addresses only. If empty, enquiries use the general contact." },
      { key: "phone", label: "Contact phone", type: "text", max: 40, group: "Contact" },
      { key: "address", label: "Address", type: "textarea", max: 300, group: "Contact" },
      { key: "capabilities", label: "Capabilities from this office", type: "strings", group: "Content" },
      { key: "projects", label: "Related work", type: "refs", refType: "project", group: "Content" },
      { key: "_notify_to", label: "Enquiry notification recipients", type: "strings", internal: true, group: "Enquiries", help: "Internal. Email addresses notified about enquiries sent to this region." },
    ],
  },
  client: {
    type: "client", label: "Client", plural: "Clients", titleLabel: "Client display name",
    description: "Approved client names. Logos only when the client has supplied them.",
    path: null, orderable: true, featurable: false, seo: false, listKeys: ["relationship"],
    fields: [
      { key: "relationship", label: "Relationship", type: "select", options: RELATIONSHIP_OPTS, group: "Basics" },
      { key: "attribution", label: "Approved attribution wording", type: "text", max: 200, group: "Basics", help: "Required for a direct or agency relationship." },
      { key: "_relationship_approved", label: "Relationship approved", type: "boolean", internal: true, group: "Basics", help: "Internal. Required to publish a direct or agency relationship." },
      { key: "logo", label: "Logo", type: "media", mediaKind: "logo", group: "Basics", help: "Only a logo the client has approved. Never recreated or approximated." },
      { key: "website", label: "Website", type: "url", group: "Basics" },
      { key: "projects", label: "Related projects", type: "refs", refType: "project", group: "Links" },
    ],
  },
  testimonial: {
    type: "testimonial", label: "Testimonial", plural: "Testimonials", titleLabel: "Label (internal)",
    description: "Client quotes. Published only with written permission; fictional samples can never be published.",
    path: null, orderable: true, featurable: true, seo: false, listKeys: ["organisation"],
    fields: [
      { key: "quote", label: "Quote", type: "textarea", required: true, max: 600, group: "Quote" },
      { key: "speaker_name", label: "Person", type: "text", required: true, max: 120, group: "Quote" },
      { key: "speaker_role", label: "Role", type: "text", required: true, max: 160, group: "Quote" },
      { key: "organisation", label: "Organisation", type: "text", required: true, max: 160, group: "Quote" },
      { key: "client", label: "Client record", type: "ref", refType: "client", group: "Links" },
      { key: "project", label: "Related project", type: "ref", refType: "project", group: "Links" },
      { key: "_permission_confirmed", label: "Written permission confirmed", type: "boolean", internal: true, group: "Approval", help: "Internal. Required to publish." },
      { key: "_sample", label: "Fictional sample", type: "boolean", internal: true, group: "Approval", help: "Sample text for layout testing. Can never be published." },
    ],
  },
  article: {
    type: "article", label: "Article", plural: "Insights (articles)", titleLabel: "Headline",
    description: "Articles and project stories.",
    path: (s) => `/insights/${s}`, orderable: false, featurable: true, seo: true, listKeys: ["category", "published_on"],
    fields: [
      { key: "excerpt", label: "Excerpt", type: "textarea", required: true, max: 300, group: "Basics" },
      { key: "category", label: "Category", type: "text", max: 60, group: "Basics" },
      { key: "author", label: "Author", type: "ref", refType: "person", group: "Basics" },
      { key: "published_on", label: "Publication date", type: "date", group: "Basics" },
      { key: "cover", label: "Cover image", type: "media", mediaKind: "image", group: "Basics" },
      { key: "body", label: "Article", type: "markdown", required: true, group: "Content" },
      { key: "technologies", label: "Related technologies", type: "refs", refType: "technology", group: "Links" },
      { key: "projects", label: "Related projects", type: "refs", refType: "project", group: "Links" },
      ...seo(),
    ],
  },
  role: {
    type: "role", label: "Open role", plural: "Careers", titleLabel: "Job title",
    description: "Open positions shown on the Careers page.",
    path: (s) => `/careers/${s}`, orderable: true, featurable: false, seo: true, listKeys: ["location"],
    fields: [
      { key: "department", label: "Department", type: "text", max: 80, group: "Basics" },
      { key: "location", label: "Location", type: "text", required: true, max: 120, group: "Basics" },
      { key: "employment_type", label: "Type", type: "select", options: [{ value: "full-time", label: "Full time" }, { value: "part-time", label: "Part time" }, { value: "contract", label: "Contract" }, { value: "internship", label: "Internship" }], group: "Basics" },
      { key: "description", label: "Description", type: "markdown", required: true, group: "Content" },
      { key: "requirements", label: "Requirements", type: "markdown", group: "Content" },
      { key: "apply_url", label: "Application link", type: "url", group: "Apply", help: "An application link or an email is required to publish." },
      { key: "apply_email", label: "Application email", type: "email", group: "Apply" },
      { key: "closes_on", label: "Closing date", type: "date", group: "Apply" },
      ...seo(),
    ],
  },
  faq: {
    type: "faq", label: "FAQ", plural: "FAQs", titleLabel: "Question",
    description: "Frequently asked questions shown on the Contact page.",
    path: null, orderable: true, featurable: false, seo: false, listKeys: ["category"],
    fields: [
      { key: "answer", label: "Answer", type: "markdown", required: true, group: "Answer" },
      { key: "category", label: "Category", type: "text", max: 60, group: "Answer" },
    ],
  },
  setting: {
    type: "setting", label: "Site settings", plural: "Site settings", titleLabel: "Name",
    description: "Public contact details, social links, footer, default SEO and the company-profile download.",
    path: null, orderable: false, featurable: false, seo: false, fixedSlugs: ["site"],
    fields: [
      { key: "company_name", label: "Company name", type: "text", max: 80, group: "Company" },
      { key: "tagline", label: "Tagline", type: "text", max: 160, group: "Company" },
      { key: "contact_email", label: "General contact email", type: "email", group: "Contact" },
      { key: "contact_phone", label: "General contact phone", type: "text", max: 40, group: "Contact" },
      { key: "linkedin", label: "LinkedIn URL", type: "url", group: "Social links" },
      { key: "instagram", label: "Instagram URL", type: "url", group: "Social links" },
      { key: "x", label: "X URL", type: "url", group: "Social links" },
      { key: "youtube", label: "YouTube URL", type: "url", group: "Social links" },
      { key: "footer_text", label: "Footer text", type: "textarea", max: 300, group: "Footer" },
      { key: "default_seo_title", label: "Default search title", type: "text", max: 70, group: "Default search and sharing" },
      { key: "default_seo_description", label: "Default search description", type: "textarea", max: 170, group: "Default search and sharing" },
      { key: "default_seo_image", label: "Default sharing image", type: "media", mediaKind: "image", group: "Default search and sharing" },
      { key: "company_profile", label: "Company profile (PDF)", type: "media", mediaKind: "document", group: "Downloads", help: "Upload the approved PDF in Media, then pick it here. Shown as a download only when set." },
      { key: "showreel_youtube_id", label: "Showreel YouTube ID", type: "text", max: 20, group: "Video", help: "Privacy-enhanced embed. Leave empty to use the built-in default." },
      { key: "film_youtube_id", label: "Second film YouTube ID", type: "text", max: 20, group: "Video" },
      { key: "showreel_mp4_url", label: "Showreel video file address (optional)", type: "url", group: "Video", help: "An approved MP4 hosted on a video or CDN service (https). Muted looping background, 15 to 30 seconds, at most 12 MB, H.264. When set it replaces the YouTube background; the YouTube film stays available behind the Play button. Large videos are not uploaded here." },
      { key: "showreel_poster", label: "Showreel poster image", type: "media", mediaKind: "image", group: "Video", help: "Still shown before the video loads and for visitors who reduce motion. 16:9, 1920 x 1080." },
      { key: "slot_cap_events", label: "Capability card: Events and exhibitions", type: "media", mediaKind: "image", group: "Image slots", help: "Replaces the designed card background. 3:4 portrait, see docs/asset-handoff.md." },
      { key: "slot_cap_centres", label: "Capability card: Experience centres", type: "media", mediaKind: "image", group: "Image slots" },
      { key: "slot_cap_permanent", label: "Capability card: Permanent installations", type: "media", mediaKind: "image", group: "Image slots" },
      { key: "slot_contact_scene", label: "Contact page scene", type: "media", mediaKind: "image", group: "Image slots", help: "Wide 12:5 landscape." },
      { key: "slot_preview_male", label: "Team preview portrait (male-named people without a photo)", type: "media", mediaKind: "image", group: "Image slots", help: "Must be a preview or fictional portrait, labelled as such." },
      { key: "slot_preview_female", label: "Team preview portrait (female-named people without a photo)", type: "media", mediaKind: "image", group: "Image slots" },
      { key: "redirect_hosts", label: "Allowed redirect hosts", type: "strings", group: "Redirects", help: "External hosts a redirect may point at, for example enginious.ae. Empty = internal redirects only." },
      { key: "privacy_status", label: "Privacy notice status", type: "select", options: [{ value: "provisional", label: "Provisional (shown as such)" }, { value: "approved", label: "Approved by the owner" }], group: "Legal" },
    ],
  },
  page_seo: {
    type: "page_seo", label: "Page search settings", plural: "Page search settings", titleLabel: "Page",
    description: "Search title, description and sharing image for fixed pages such as Home, Work and Contact.",
    path: null, orderable: false, featurable: false, seo: false,
    fixedSlugs: ["home", "work", "technologies", "solutions", "company", "team", "uae", "saudi-arabia", "europe", "insights", "careers", "contact", "privacy"],
    fields: [...seo()].map((f) => ({ ...f, group: undefined })),
  },
};

export const typeDef = (t: string): TypeDef | null => (CONTENT_TYPES as readonly string[]).includes(t) ? TYPE_DEFS[t as ContentType] : null;

/** Map a page_seo slug to its public path. */
export const PAGE_SEO_PATHS: Record<string, string> = {
  home: "/", work: "/work", technologies: "/technologies", solutions: "/solutions", company: "/company", team: "/company/team",
  uae: "/uae", "saudi-arabia": "/saudi-arabia", europe: "/europe", insights: "/insights", careers: "/careers", contact: "/contact", privacy: "/privacy",
};

// --------------------------------------------------------------------------- helpers
export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const MEDIA_ID = /^[a-z0-9-]{1,80}$/;

export type Data = Record<string, unknown>;
export type FieldErrors = Record<string, string>;

const isEmpty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
const asStr = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\u0000/g, "").slice(0, max) : "");

function cleanField(f: Field, v: unknown, errors: FieldErrors, path: string): unknown {
  const max = f.max ?? (f.type === "markdown" ? 40000 : f.type === "textarea" ? 2000 : 300);
  switch (f.type) {
    case "text": case "textarea": case "markdown": {
      if (v === undefined || v === null) return undefined;
      if (typeof v !== "string") { errors[path] = `${f.label} must be text.`; return undefined; }
      if (v.length > max) errors[path] = `${f.label} is too long (maximum ${max} characters).`;
      const s = asStr(v, max);
      return s.trim() === "" ? undefined : s;
    }
    case "email": {
      const s = asStr(v, 254).trim(); if (!s) return undefined;
      if (!EMAIL.test(s)) errors[path] = `${f.label} is not a valid email address.`; return s;
    }
    case "url": {
      const s = asStr(v, 500).trim(); if (!s) return undefined;
      if (!/^https:\/\/[^\s]+$/.test(s)) { errors[path] = `${f.label} must be a full https:// address.`; return s; }
      if (f.video) {
        const pv = parseVideoUrl(s);
        if (!pv || (f.video === "file" && pv.kind !== "file")) errors[path] = f.video === "file" ? `${f.label} must be a direct link to a video file (ending .mp4, .webm, .m4v or .mov), not a sharing page.` : `${f.label} must be a YouTube link or a direct link to a video file (.mp4, .webm, .m4v, .mov). SharePoint, OneDrive and Google Drive sharing pages are not supported.`;
      }
      return s;
    }
    case "number": {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) { errors[path] = `${f.label} must be a number.`; return undefined; }
      if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) { errors[path] = `${f.label} must be between ${f.min ?? "-"} and ${f.max ?? "-"}.`; return undefined; }
      return n;
    }
    case "boolean": return v === true || v === "true" || v === "on";
    case "date": {
      const s = asStr(v, 10); if (!s) return undefined;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) errors[path] = `${f.label} must be a valid date.`; return s;
    }
    case "select": {
      const s = asStr(v, 80); if (!s) return undefined;
      if (!f.options?.some((o) => o.value === s)) { errors[path] = `${f.label}: choose one of the listed options.`; return undefined; }
      return s;
    }
    case "multiselect": {
      const a = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
      const bad = a.some((x) => !f.options?.some((o) => o.value === x)); if (bad) errors[path] = `${f.label}: choose from the listed options.`;
      return a.length ? a : undefined;
    }
    case "media": {
      const s = asStr(v, 80); if (!s) return undefined;
      if (!MEDIA_ID.test(s)) { errors[path] = `${f.label}: invalid media reference.`; return undefined; } return s;
    }
    case "ref": {
      const s = asStr(v, 80); if (!s) return undefined;
      if (!SLUG_RE.test(s)) { errors[path] = `${f.label}: invalid reference.`; return undefined; } return s;
    }
    case "mediaList": case "refs": {
      const a = Array.isArray(v) ? v : [];
      const re = f.type === "mediaList" ? MEDIA_ID : SLUG_RE;
      const out: string[] = [];
      for (const x of a) { if (typeof x === "string" && re.test(x) && !out.includes(x)) out.push(x); }
      if (out.length > 60) errors[path] = `${f.label}: too many items.`;
      return out.length ? out.slice(0, 60) : undefined;
    }
    case "strings": {
      const a = Array.isArray(v) ? v : [];
      const out = a.map((x) => asStr(x, max).trim()).filter(Boolean).slice(0, 40);
      if (f.key === "redirect_hosts") for (const h of out) if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(h)) errors[path] = `${f.label}: "${h}" is not a valid host name.`;
      if (f.key === "_notify_to") for (const e of out) if (!EMAIL.test(e)) errors[path] = `${f.label}: "${e}" is not a valid email address.`;
      return out.length ? out : undefined;
    }
    case "records": {
      const rows = Array.isArray(v) ? v.slice(0, 40) : [];
      const out: Data[] = [];
      rows.forEach((row, i) => {
        if (typeof row !== "object" || row === null) return;
        const o: Data = {};
        for (const sf of f.fields ?? []) {
          const cv = cleanField(sf, (row as Data)[sf.key], errors, `${path}.${i}.${sf.key}`);
          if (cv !== undefined && cv !== false) o[sf.key] = cv; else if (cv === false) o[sf.key] = false;
        }
        if (Object.values(o).some((x) => x !== undefined && x !== false && x !== "")) out.push(o);
      });
      return out.length ? out : undefined;
    }
  }
}

/** Keep only fields defined for the type, coerce them, and report format problems. Safe to run on every save. */
export function cleanData(def: TypeDef, raw: unknown): { data: Data; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const data: Data = {};
  const src = typeof raw === "object" && raw !== null ? (raw as Data) : {};
  for (const f of def.fields) {
    if (f.internal !== undefined && f.internal !== f.key.startsWith("_")) throw new Error(`schema: ${def.type}.${f.key} internal flag/prefix mismatch`);
    const v = cleanField(f, src[f.key], errors, f.key);
    if (v !== undefined && !(f.type === "boolean" && v === false)) data[f.key] = v;
  }
  if (def.type === "page_seo" || def.seo) {
    const c = data.seo_canonical;
    if (typeof c === "string" && (!c.startsWith("/") || c.startsWith("//") || /[\s\\]/.test(c))) errors.seo_canonical = "Canonical must be a path on this site, starting with a single /.";
  }
  return { data, errors };
}

/** Publish-time checks (in addition to cleanData). Mirrors the database backstop with field-level messages. */
export function validateForPublish(def: TypeDef, title: string, data: Data): FieldErrors {
  const errors: FieldErrors = {};
  if (!title.trim()) errors.title = `${def.titleLabel} is required.`;
  for (const f of def.fields) if (f.required && isEmpty(data[f.key])) errors[f.key] = `${f.label} is required to publish.`;
  if (def.type === "project") {
    const outcomes = (data.outcomes as Data[] | undefined) ?? [];
    outcomes.forEach((o, i) => { if (o.verified !== true) errors[`outcomes.${i}.verified`] = "Mark this outcome as verified, or remove it, before publishing."; });
  }
  if (def.type === "technology") {
    const specs = (data.specs as Data[] | undefined) ?? [];
    specs.forEach((o, i) => { if (o.confirmed !== true) errors[`specs.${i}.confirmed`] = "Mark this specification as confirmed, or remove it, before publishing."; });
  }
  if (def.type === "testimonial") {
    if (data._permission_confirmed !== true) errors._permission_confirmed = "Written permission must be confirmed before publishing.";
    if (data._sample === true) errors._sample = "Sample testimonials can never be published.";
  }
  if (def.type === "client" && (data.relationship === "direct" || data.relationship === "agency")) {
    if (data._relationship_approved !== true) errors._relationship_approved = "Approve the relationship before publishing it.";
    if (isEmpty(data.attribution)) errors.attribution = "Approved attribution wording is required.";
  }
  if (def.type === "role" && isEmpty(data.apply_url) && isEmpty(data.apply_email)) errors.apply_url = "Add an application link or an application email.";
  return errors;
}

export const fieldByKey = (def: TypeDef, key: string) => def.fields.find((f) => f.key === key);
