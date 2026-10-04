import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/cms/auth";
import { getItem, getRevisions, listOptions } from "@/lib/cms/items";
import { listMediaOptions } from "@/lib/cms/media-list";
import { CONTENT_TYPES, typeDef, type ContentType } from "@/lib/cms/schema";
import { ContentEditor } from "@/components/admin/ContentEditor";
import type { RefMap } from "@/components/admin/fields/types";

export const metadata: Metadata = { title: "Edit" };

export default async function EditItem({ params }: { params: Promise<{ type: string; id: string }> }) {
  const staff = await requireStaffPage();
  const { type, id } = await params;
  const def = typeDef(type);
  if (!def) notFound();
  const item = await getItem(id);
  if (!item || item.type !== def.type) notFound();

  const refTypes = new Set<ContentType>();
  const collect = (fields: typeof def.fields) => fields.forEach((f) => { if (f.refType) refTypes.add(f.refType); if (f.fields) collect(f.fields); });
  collect(def.fields);
  const [revisions, media, ...refLists] = await Promise.all([getRevisions(id), listMediaOptions(), ...[...refTypes].map((t) => listOptions(t))]);
  const refs: RefMap = {};
  [...refTypes].forEach((t, i) => { refs[t] = refLists[i]; });
  void CONTENT_TYPES;

  const prefix = def.path ? def.path("{slug}").replace("{slug}", "") : "";
  return (
    <ContentEditor
      item={{ id: item.id, type: item.type, title: item.title, slug: item.slug, status: item.status, version: item.version, publishedVersion: item.published_version, publishedAt: item.published_at, updatedAt: item.updated_at, sortOrder: item.sort_order, featured: item.featured, data: item.draft }}
      def={{ type: def.type, label: def.label, titleLabel: def.titleLabel, fields: def.fields, fixedSlugs: def.fixedSlugs, orderable: def.orderable, featurable: def.featurable, publicPath: def.path ? def.path(item.slug) : null, slugPrefix: prefix }}
      media={media}
      refs={refs}
      revisions={revisions}
      role={staff.role}
    />
  );
}
