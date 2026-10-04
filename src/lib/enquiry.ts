// Enquiry validation. Self-contained (no path aliases) so it can run under `node --test`.

export const REGION_VALUES = ["uae", "ksa", "europe"] as const;
export const PROJECT_TYPE_VALUES = ["event", "permanent", "other"] as const;
export const BUDGET_VALUES = ["under-50k", "50-150k", "150-500k", "over-500k", "unsure"] as const;

export interface EnquiryInput {
  submissionId: string;
  region: (typeof REGION_VALUES)[number];
  name: string;
  email: string;
  message: string;
  company: string | null;
  country: string | null;
  projectType: (typeof PROJECT_TYPE_VALUES)[number] | null;
  eventDate: string | null;
  budget: (typeof BUDGET_VALUES)[number] | null;
  technologies: string[];
}

export type FieldErrors = Partial<Record<keyof EnquiryInput | "form", string>>;
export type ParseResult =
  | { ok: true; value: EnquiryInput; honeypot: false }
  | { ok: true; honeypot: true }
  | { ok: false; errors: FieldErrors };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
const SLUG = /^[a-z0-9-]{1,60}$/;

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\u0000/g, "").trim();
  return t.length === 0 ? null : t.slice(0, max + 1);
};

const oneOf = <T extends readonly string[]>(list: T, v: unknown): T[number] | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T[number]) : null;

export function parseEnquiry(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null) return { ok: false, errors: { form: "Invalid request." } };
  const b = raw as Record<string, unknown>;

  // Honeypot: real visitors never fill this hidden field.
  if (typeof b.website === "string" && b.website.trim() !== "") return { ok: true, honeypot: true };

  const errors: FieldErrors = {};

  const submissionId = typeof b.submissionId === "string" && UUID.test(b.submissionId) ? b.submissionId : null;
  if (!submissionId) errors.submissionId = "Missing submission id. Please reload the page.";

  const region = oneOf(REGION_VALUES, b.region);
  if (!region) errors.region = "Please choose a team.";

  const name = str(b.name, 120);
  if (!name) errors.name = "Please enter your name.";
  else if (name.length > 120) errors.name = "Name is too long.";

  const email = str(b.email, 254);
  if (!email) errors.email = "Please enter your work email.";
  else if (email.length > 254 || !EMAIL.test(email)) errors.email = "Please enter a valid email address.";

  const message = str(b.message, 5000);
  if (!message) errors.message = "Please tell us about your project.";
  else if (message.length < 10) errors.message = "Please add a little more detail (at least 10 characters).";
  else if (message.length > 5000) errors.message = "Message is too long (max 5000 characters).";

  const company = str(b.company, 160);
  if (company && company.length > 160) errors.company = "Company name is too long.";
  const country = str(b.country, 80);
  if (country && country.length > 80) errors.country = "Country is too long.";

  const projectType = b.projectType ? oneOf(PROJECT_TYPE_VALUES, b.projectType) : null;
  if (b.projectType && !projectType) errors.projectType = "Please choose a project type.";

  const budget = b.budget ? oneOf(BUDGET_VALUES, b.budget) : null;
  if (b.budget && !budget) errors.budget = "Please choose a budget range.";

  let eventDate: string | null = null;
  if (b.eventDate) {
    const d = str(b.eventDate, 10);
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) errors.eventDate = "Please use a valid date.";
    else eventDate = d;
  }

  let technologies: string[] = [];
  if (b.technologies !== undefined) {
    if (!Array.isArray(b.technologies) || b.technologies.length > 12 || !b.technologies.every((t) => typeof t === "string" && SLUG.test(t)))
      errors.technologies = "Invalid technology selection.";
    else technologies = [...new Set(b.technologies as string[])];
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    honeypot: false,
    value: {
      submissionId: submissionId!,
      region: region!,
      name: name!,
      email: email!,
      message: message!,
      company,
      country,
      projectType,
      eventDate,
      budget,
      technologies,
    },
  };
}

const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
/** Human-friendly reference, e.g. ENQ-7K2M9QXA. Uniqueness is enforced by the database. */
export function makeReference(random: (n: number) => Uint8Array): string {
  const bytes = random(8);
  let out = "";
  for (const x of bytes) out += ALPHABET[x % ALPHABET.length];
  return `ENQ-${out}`;
}
