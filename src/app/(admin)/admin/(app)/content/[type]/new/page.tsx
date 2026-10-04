import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/cms/auth";
import { listItems } from "@/lib/cms/items";
import { typeDef } from "@/lib/cms/schema";
import { NewItemForm } from "@/components/admin/NewItemForm";

export const metadata: Metadata = { title: "New item" };

export default async function NewItem({ params }: { params: Promise<{ type: string }> }) {
  await requireStaffPage();
  const { type } = await params;
  const def = typeDef(type);
  if (!def) notFound();
  let available: string[] | undefined;
  if (def.fixedSlugs) {
    const { rows } = await listItems({ type: def.type, status: "all", pageSize: 100 });
    const { rows: arch } = await listItems({ type: def.type, status: "archived", pageSize: 100 });
    const used = new Set([...rows, ...arch].map((r) => r.slug));
    available = def.fixedSlugs.filter((s) => !used.has(s));
  }
  return (
    <>
      <div className="adm-head">
        <div>
          <p className="adm-crumbs"><Link href="/admin">Dashboard</Link> / <Link href={`/admin/content/${def.type}`}>{def.plural}</Link> / New</p>
          <h1>New {def.label.toLowerCase()}</h1>
          <p>It is saved as a draft. Nothing is public until you publish it.</p>
        </div>
      </div>
      <div className="adm-card" style={{ maxWidth: 640 }}>
        <NewItemForm type={def.type} titleLabel={def.titleLabel} fixedSlugs={available} />
      </div>
    </>
  );
}
