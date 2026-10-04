import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/cms/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { publicUrl, variantUrl } from "@/lib/media";
import { MediaEditor } from "@/components/admin/MediaEditor";

export const metadata: Metadata = { title: "Media" };

export default async function MediaDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const sb = await supabaseUser();
  if (!sb || !/^[a-z0-9-]{1,80}$/.test(id)) notFound();
  const { data: m } = await sb.from("media_assets").select("*").eq("id", id).maybeSingle();
  if (!m) notFound();
  const { data: refs } = await sb.rpc("cms_media_references", { p_id: id });
  let preview: string | null = null;
  if (m.visibility === "public" && m.kind !== "document") preview = variantUrl(m, 960);
  else if (m.visibility === "private" && m.kind !== "document") {
    const widths: number[] = m.variants ?? [];
    const w = widths.find((x) => x >= 960) ?? widths[widths.length - 1];
    const s = w ? await sb.storage.from("private").createSignedUrl(`${m.storage_path}-${w}.webp`, 300) : null;
    preview = s?.data?.signedUrl ?? null;
  }
  const docUrl = m.kind === "document" && m.visibility === "public" ? publicUrl("documents", m.storage_path) : null;
  return (
    <>
      <div className="adm-head"><div><p className="adm-crumbs"><Link href="/admin">Dashboard</Link> / <Link href="/admin/media">Media library</Link> / {m.title || m.id}</p><h1>{m.title || m.alt || m.id}</h1><p className="adm-mono adm-help">{m.id}</p></div></div>
      <MediaEditor media={m} preview={preview} docUrl={docUrl} usage={(refs ?? []) as never} />
    </>
  );
}
