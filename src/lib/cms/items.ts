import "server-only";
import { supabaseUser } from "@/lib/supabase/server";
import type { ContentType } from "./schema";

export type Status = "draft" | "published" | "archived";

export interface ItemRow {
  id: string;
  type: ContentType;
  locale: string;
  slug: string;
  title: string;
  status: Status;
  draft: Record<string, unknown>;
  sort_order: number;
  featured: boolean;
  version: number;
  published_version: number | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
  updated_by: string | null;
}
export type ItemListRow = Omit<ItemRow, "draft"> & { draft: Record<string, unknown> };

export interface RevisionRow {
  id: number;
  kind: "draft" | "published";
  version: number;
  title: string;
  slug: string;
  created_at: string;
  created_by: string | null;
}

const LIST_COLUMNS = "id,type,locale,slug,title,status,draft,sort_order,featured,version,published_version,published_at,updated_at,created_at,updated_by";

export interface ListQuery {
  type: ContentType;
  status?: Status | "all" | "pending";
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: "updated" | "title" | "order";
}

export async function listItems(q: ListQuery): Promise<{ rows: ItemListRow[]; count: number; error?: string }> {
  const sb = await supabaseUser();
  if (!sb) return { rows: [], count: 0, error: "not_configured" };
  const pageSize = Math.min(Math.max(q.pageSize ?? 20, 5), 100);
  const page = Math.max(q.page ?? 1, 1);
  let query = sb.from("content_items").select(LIST_COLUMNS, { count: "exact" }).eq("type", q.type);
  if (q.status && q.status !== "all" && q.status !== "pending") query = query.eq("status", q.status);
  if (q.status === "all" || !q.status) query = query.neq("status", "archived");
  const term = (q.q ?? "").trim().replace(/[%*,()]/g, " ").slice(0, 80);
  if (term) query = query.or(`title.ilike.*${term}*,slug.ilike.*${term}*`);
  if (q.sort === "title") query = query.order("title", { ascending: true });
  else if (q.sort === "order") query = query.order("sort_order", { ascending: true }).order("title", { ascending: true });
  else query = query.order("updated_at", { ascending: false });
  const from = (page - 1) * pageSize;
  const { data, count, error } = await query.range(from, from + pageSize - 1);
  if (error) return { rows: [], count: 0, error: error.message };
  let rows = (data ?? []) as ItemListRow[];
  if (q.status === "pending") rows = rows.filter((r) => r.status === "published" && r.published_version !== r.version);
  return { rows, count: count ?? rows.length };
}

export async function getItem(id: string): Promise<ItemRow | null> {
  const sb = await supabaseUser();
  if (!sb || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await sb.from("content_items").select(LIST_COLUMNS).eq("id", id).maybeSingle();
  return (data as ItemRow | null) ?? null;
}

export async function getRevisions(id: string): Promise<RevisionRow[]> {
  const sb = await supabaseUser();
  if (!sb) return [];
  const { data } = await sb.from("content_revisions").select("id,kind,version,title,slug,created_at,created_by").eq("item_id", id).order("id", { ascending: false }).limit(40);
  return (data ?? []) as RevisionRow[];
}

/** Titles of items of the given types, for reference pickers (refs fields). */
export async function listOptions(type: ContentType): Promise<{ slug: string; title: string; status: Status }[]> {
  const sb = await supabaseUser();
  if (!sb) return [];
  const { data } = await sb.from("content_items").select("slug,title,status").eq("type", type).neq("status", "archived").order("title").limit(500);
  return (data ?? []) as { slug: string; title: string; status: Status }[];
}

export interface Counts { total: number; draft: number; published: number; pending: number; archived: number }

/** Dashboard counts per type, computed from compact rows. */
export async function countsByType(): Promise<Record<string, Counts>> {
  const sb = await supabaseUser();
  const out: Record<string, Counts> = {};
  if (!sb) return out;
  const { data } = await sb.from("content_items").select("type,status,version,published_version").limit(5000);
  for (const r of (data ?? []) as { type: string; status: Status; version: number; published_version: number | null }[]) {
    const c = (out[r.type] ??= { total: 0, draft: 0, published: 0, pending: 0, archived: 0 });
    c.total++;
    if (r.status === "draft") c.draft++;
    else if (r.status === "archived") c.archived++;
    else { c.published++; if (r.published_version !== r.version) c.pending++; }
  }
  return out;
}

export async function recentEdits(limit = 8): Promise<Pick<ItemRow, "id" | "type" | "title" | "slug" | "status" | "updated_at" | "updated_by">[]> {
  const sb = await supabaseUser();
  if (!sb) return [];
  const { data } = await sb.from("content_items").select("id,type,title,slug,status,updated_at,updated_by").order("updated_at", { ascending: false }).limit(limit);
  return (data ?? []) as never;
}

export interface MissingItem { label: string; detail: string; href: string }

/** "What is still missing?" for the dashboard, computed from the working copies. */
export async function missingContent(): Promise<MissingItem[]> {
  const sb = await supabaseUser();
  if (!sb) return [];
  const { data } = await sb.from("content_items").select("type,slug,title,status,draft").neq("status", "archived").limit(5000);
  const rows = (data ?? []) as { type: ContentType; slug: string; title: string; status: Status; draft: Record<string, unknown> }[];
  const of = (t: ContentType) => rows.filter((r) => r.type === t);
  const out: MissingItem[] = [];
  const live = (t: ContentType) => of(t).filter((r) => r.status === "published").length;
  if (!of("project").length) out.push({ label: "No projects in the CMS yet", detail: "Use Import on the Projects page to bring in the existing approved list.", href: "/admin/content/project" });
  if (!live("testimonial")) out.push({ label: "No published testimonials", detail: "The Testimonials section stays hidden until at least one approved testimonial is published.", href: "/admin/content/testimonial" });
  if (!live("article")) out.push({ label: "No published articles", detail: "Insights shows an empty state until the first article is published.", href: "/admin/content/article" });
  if (!live("role")) out.push({ label: "No open roles", detail: "Careers shows 'no open vacancies' until a role is published.", href: "/admin/content/role" });
  if (!live("faq")) out.push({ label: "No FAQs", detail: "Add questions people ask before they enquire.", href: "/admin/content/faq" });
  const clients = of("client");
  const unconfirmed = clients.filter((c) => (c.draft.relationship ?? "unconfirmed") === "unconfirmed").length;
  if (unconfirmed) out.push({ label: `${unconfirmed} client${unconfirmed === 1 ? "" : "s"} with no confirmed relationship`, detail: "Shown by name only. Confirm direct or agency delivery and approved wording to say more.", href: "/admin/content/client" });
  const people = of("person");
  const noPortrait = people.filter((p) => !p.draft.portrait).length;
  if (noPortrait) out.push({ label: `${noPortrait} ${noPortrait === 1 ? "person has" : "people have"} no portrait`, detail: "Real, supplied photographs only.", href: "/admin/content/person" });
  const msg = people.filter((p) => p.draft.leadership === true && !p.draft.message).length;
  if (msg) out.push({ label: `${msg} leader${msg === 1 ? "" : "s"} without a message`, detail: "Messages stay private until written and approved.", href: "/admin/content/person" });
  const unapproved = people.filter((p) => p.draft.message && p.draft._message_approved !== true).length;
  if (unapproved) out.push({ label: `${unapproved} leadership message${unapproved === 1 ? "" : "s"} awaiting approval`, detail: "Not public until approved.", href: "/admin/content/person" });
  const regions = of("region");
  const noEmail = regions.filter((r) => !r.draft.email).length;
  if (regions.length && noEmail) out.push({ label: `${noEmail} region${noEmail === 1 ? "" : "s"} without a contact email`, detail: "Enquiries for that region use the general contact.", href: "/admin/content/region" });
  const noMedia = of("project").filter((p) => p.status === "published" && !(p.draft.media as unknown[] | undefined)?.length).length;
  if (noMedia) out.push({ label: `${noMedia} published project${noMedia === 1 ? "" : "s"} without media`, detail: "Add authentic project photos or video when approved.", href: "/admin/content/project" });
  const site = of("setting").find((s) => s.slug === "site");
  if (!site) out.push({ label: "Site settings not created", detail: "Public contact details, social links, default SEO and the company profile download live here.", href: "/admin/content/setting" });
  else {
    if (!site.draft.company_profile) out.push({ label: "No company profile PDF", detail: "The download button stays hidden until an approved PDF is chosen.", href: "/admin/content/setting" });
    if (!site.draft.default_seo_description) out.push({ label: "No default search description", detail: "Used by pages that do not set their own.", href: "/admin/content/setting" });
  }
  const seoDone = of("page_seo").filter((r) => r.draft.seo_description).length;
  if (seoDone < 13) out.push({ label: `${13 - seoDone} fixed page${13 - seoDone === 1 ? "" : "s"} without search text`, detail: "Home, Work, Contact and the others fall back to the defaults.", href: "/admin/content/page_seo" });
  return out;
}
