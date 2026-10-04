import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToBrief } from "@/components/AddToBrief";
import { JsonLd } from "@/components/JsonLd";
import { Markdown } from "@/components/Markdown";
import { Photo } from "@/components/Photo";
import { Placeholder } from "@/components/Placeholder";
import { TriHelixDemo } from "@/components/TriHelixDemo";
import { TECH_CATEGORIES } from "@/content/technologies";
import { getContent } from "@/lib/content/load";
import { breadcrumbLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateStaticParams() {
  return (await getContent()).technologies.filter((t) => t.detailed).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/technologies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const t = (await getContent()).technologies.find((x) => x.slug === slug && x.detailed);
  if (!t) return { title: "Not found", robots: { index: false } };
  return buildMetadata({ path: `/technologies/${t.slug}`, title: t.name, description: t.summary, seo: t.seo, image: t.media?.[0] });
}

export default async function TechnologyPage({ params }: PageProps<"/technologies/[slug]">) {
  const { slug } = await params;
  const c = await getContent();
  const t = c.technologies.find((x) => x.slug === slug);
  if (!t || !t.detailed) notFound();
  const cat = TECH_CATEGORIES.find((x) => x.key === t.category)!;
  const related = t.projects.map((s) => c.projects.find((p) => p.slug === s)).filter((p): p is NonNullable<typeof p> => !!p);
  // The first paragraph of the description is the introduction; the rest is the body.
  const [intro, ...restParts] = (t.description ?? "").split(/\n\s*\n/);
  const body = restParts.join("\n\n");
  const media = (t.media ?? []).filter((id) => c.images[id]);

  return (
    <div className="container section" style={{ paddingTop: "clamp(24px, 4vw, 56px)" }}>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Technologies", path: "/technologies" }, { name: t.name, path: `/technologies/${t.slug}` }])} />
      <nav aria-label="Breadcrumb" className="muted" style={{ fontSize: "0.85rem" }}>
        <Link href="/technologies">Technologies</Link> / {cat.label} / <span aria-current="page" style={{ color: "#fff" }}>{t.name}</span>
      </nav>

      <div className="detail-grid">
        <div className="stack" style={{ ["--stack" as string]: "1.25rem" }}>
          <p className="eyebrow">{cat.label} · digital art</p>
          <h1>{t.name}</h1>
          <p className="lede">{intro || t.summary}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <AddToBrief slug={t.slug} name={t.name} />
            <Link href={`/contact?tech=${t.slug}`} className="btn">Enquire about {t.name}</Link>
          </div>
        </div>
        {t.slug === "tri-helix" ? <TriHelixDemo /> : media[0] ? <div style={{ position: "relative", aspectRatio: "4 / 3", borderRadius: 14, overflow: "hidden" }}><Photo id={media[0]} sizes="(max-width: 900px) 100vw, 560px" priority /></div> : <Placeholder title={`${t.name}`} style={{ minHeight: 280 }} />}
      </div>

      {body && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <div style={{ maxWidth: 820 }}><Markdown source={body} className="md prose" /></div>
        </section>
      )}

      {t.useCases && t.useCases.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <h2>Use cases</h2>
          <ul style={{ marginTop: 14, paddingLeft: "1.2rem" }}>{t.useCases.map((u) => <li key={u}>{u}</li>)}</ul>
        </section>
      )}

      {t.specs && t.specs.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <h2>Specifications</h2>
          <dl className="facts" style={{ marginTop: 16 }}>{t.specs.map((s) => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}</dl>
        </section>
      )}

      {media.length > 1 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <h2>Gallery</h2>
          <div className="three" style={{ marginTop: 16 }}>{media.slice(1).map((id) => <div key={id} style={{ position: "relative", aspectRatio: "4 / 3", overflow: "hidden", borderRadius: 12 }}><Photo id={id} sizes="(max-width: 900px) 100vw, 400px" /></div>)}</div>
        </section>
      )}

      {related.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <h2>Related projects</h2>
          <ul className="tech-grid" style={{ marginTop: 20 }}>
            {related.map((p) => (
              <li key={p.slug} className="panel tech-item">
                <p className="eyebrow">{p.location} · {p.year}</p>
                <h3 style={{ marginTop: 6 }}>{p.title}</h3>
                <p className="muted" style={{ marginTop: 8, fontSize: "0.92rem" }}>{p.summary}</p>
                <Link href={p.caseStudy ? `/work/${p.slug}` : "/work"} className="accent" style={{ marginTop: "auto", paddingTop: 14 }}>
                  {p.caseStudy ? "Read case study →" : "View in Work →"}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
