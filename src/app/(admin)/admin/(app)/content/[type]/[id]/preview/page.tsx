import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/cms/auth";
import { getItem } from "@/lib/cms/items";
import { typeDef, type Field } from "@/lib/cms/schema";
import { Markdown } from "@/components/Markdown";

export const metadata: Metadata = { title: "Draft preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function Value({ f, v }: { f: Field; v: unknown }) {
  if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) return <span className="adm-help">Not set</span>;
  switch (f.type) {
    case "markdown": return <Markdown source={String(v)} />;
    case "boolean": return <>{v === true ? "Yes" : "No"}</>;
    case "strings": case "refs": case "mediaList": return <ul style={{ margin: 0, paddingLeft: 18 }}>{(v as string[]).map((x) => <li key={x}>{x}</li>)}</ul>;
    case "records": return <ul style={{ margin: 0, paddingLeft: 18 }}>{(v as Record<string, unknown>[]).map((r, i) => <li key={i}>{Object.entries(r).map(([k, x]) => `${k}: ${String(x)}`).join(" · ")}</li>)}</ul>;
    default: return <span style={{ whiteSpace: "pre-wrap" }}>{String(v)}</span>;
  }
}

/** Staff-only preview of the DRAFT (not what is live). Public pages never show this. */
export default async function Preview({ params }: { params: Promise<{ type: string; id: string }> }) {
  await requireStaffPage();
  const { type, id } = await params;
  const def = typeDef(type);
  const item = def ? await getItem(id) : null;
  if (!def || !item || item.type !== def.type) notFound();
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 80px" }}>
      <p className="adm-alert adm-alert-warn" role="note">Draft preview. This is the working copy and may differ from the live page. Only signed-in CMS users can see this. <Link href={`/admin/content/${def.type}/${item.id}`} style={{ textDecoration: "underline" }}>Back to the editor</Link></p>
      <p className="adm-crumbs" style={{ marginTop: 18 }}>{def.label} · {item.status}{item.status === "published" && item.published_version !== item.version ? " · has unpublished edits" : ""}</p>
      <h1 style={{ marginBottom: 6 }}>{item.title}</h1>
      <p className="adm-mono adm-help">{def.path ? def.path(item.slug) : item.slug}</p>
      <div style={{ display: "grid", gap: 18, marginTop: 22 }}>
        {def.fields.filter((f) => !f.internal).map((f) => (
          <section key={f.key}>
            <h2 style={{ fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--a-muted)", marginBottom: 6 }}>{f.label}</h2>
            <Value f={f} v={item.draft[f.key]} />
          </section>
        ))}
      </div>
    </main>
  );
}
