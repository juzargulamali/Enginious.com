import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { Photo } from "@/components/Photo";
import { JsonLd } from "@/components/JsonLd";
import { getContent } from "@/lib/content/load";
import { articleLd, breadcrumbLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { toPlainText } from "@/lib/markdown";

export async function generateStaticParams() {
  return (await getContent()).articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = (await getContent()).articles.find((x) => x.slug === slug);
  if (!a) return { title: "Not found", robots: { index: false } };
  return buildMetadata({ path: `/insights/${a.slug}`, title: a.title, description: a.excerpt || toPlainText(a.body, 160), seo: a.seo, image: a.cover, type: "article", publishedTime: a.publishedOn });
}

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "");

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getContent();
  const a = c.articles.find((x) => x.slug === slug);
  if (!a) notFound();
  const author = a.author ? c.people.find((p) => p.id === a.author) : undefined;
  const techs = a.technologies.map((t) => c.technologies.find((x) => x.slug === t)).filter((t): t is NonNullable<typeof t> => !!t);
  const projects = a.projects.map((t) => c.projects.find((x) => x.slug === t)).filter((t): t is NonNullable<typeof t> => !!t);
  return (
    <>
      <JsonLd data={articleLd(c, { title: a.title, excerpt: a.excerpt, path: `/insights/${a.slug}`, publishedOn: a.publishedOn, updatedAt: a.updatedAt, author: a.author })} />
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Insights", path: "/insights" }, { name: a.title, path: `/insights/${a.slug}` }])} />
      <article className="container section" style={{ paddingTop: "clamp(32px, 6vw, 80px)", maxWidth: 820 }}>
        <p className="eyebrow"><Link href="/insights">Insights</Link>{a.category ? ` · ${a.category}` : ""}</p>
        <h1 style={{ marginTop: 12, fontSize: "clamp(2rem, 5vw, 3.4rem)" }}>{a.title}</h1>
        <p className="muted" style={{ marginTop: 14 }}>{[fmt(a.publishedOn), author?.name].filter(Boolean).join(" · ")}</p>
        {a.cover && <div style={{ aspectRatio: "16 / 9", position: "relative", margin: "28px 0", borderRadius: 14, overflow: "hidden" }}><Photo id={a.cover} sizes="(max-width: 900px) 100vw, 820px" priority /></div>}
        <Markdown source={a.body} className="md prose" />
        {(techs.length > 0 || projects.length > 0) && (
          <aside style={{ marginTop: 40 }} aria-label="Related">
            <p className="eyebrow">Related</p>
            <p style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {techs.map((t) => <Link key={t.slug} href={`/technologies/${t.slug}`} className="chip">{t.name}</Link>)}
              {projects.map((p) => <Link key={p.slug} href={`/work/${p.slug}`} className="chip">{p.title}</Link>)}
            </p>
          </aside>
        )}
        <p style={{ marginTop: 40 }}><Link href="/contact" className="btn btn-primary">Start a project →</Link> <Link href="/insights" className="btn">All articles</Link></p>
      </article>
    </>
  );
}
