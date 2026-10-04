import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToBrief } from "@/components/AddToBrief";
import { Placeholder } from "@/components/Placeholder";
import { ReviewNote } from "@/components/ReviewNote";
import { TriHelixDemo } from "@/components/TriHelixDemo";
import { projectBySlug } from "@/content/projects";
import { TECHNOLOGIES, TECH_CATEGORIES, techBySlug } from "@/content/technologies";

export const dynamicParams = false;
export function generateStaticParams() {
  return TECHNOLOGIES.filter((t) => t.detailed).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/technologies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const t = techBySlug(slug);
  if (!t) return {};
  return { title: t.name, description: t.summary, alternates: { canonical: `/technologies/${t.slug}` } };
}

export default async function TechnologyPage({ params }: PageProps<"/technologies/[slug]">) {
  const { slug } = await params;
  const t = techBySlug(slug);
  if (!t || !t.detailed) notFound();
  const cat = TECH_CATEGORIES.find((c) => c.key === t.category)!;
  const related = t.projects.map(projectBySlug).filter((p) => !!p);

  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Technologies", item: "/technologies" },
      { "@type": "ListItem", position: 2, name: t.name, item: `/technologies/${t.slug}` },
    ],
  };

  return (
    <div className="container section" style={{ paddingTop: "clamp(24px, 4vw, 56px)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <nav aria-label="Breadcrumb" className="muted" style={{ fontSize: "0.85rem" }}>
        <Link href="/technologies">Technologies</Link> / {cat.label} / <span aria-current="page" style={{ color: "#fff" }}>{t.name}</span>
      </nav>

      <div className="detail-grid">
        <div className="stack" style={{ ["--stack" as string]: "1.25rem" }}>
          <p className="eyebrow">{cat.label} · digital art</p>
          <h1>{t.name}</h1>
          <p className="lede">
            {t.name} is a unique kinetic technology of rotating triangular screens that stack and rotate 360 degrees.
            When aligned, they create immersive displays with adjustable shapes such as hexagons and cylinders. Joined
            together, they form an LED wall that can transform back into rotating triangles for dynamic presentations:
            a convertible display.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <AddToBrief slug={t.slug} name={t.name} />
            <Link href={`/contact?tech=${t.slug}`} className="btn">Enquire about {t.name}</Link>
          </div>
        </div>
        <TriHelixDemo />
      </div>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="two-col">
          <div className="stack" style={{ ["--stack" as string]: "0.75rem" }}>
            <h2>How visitors interact</h2>
            <p className="muted">
              Tri-Helix can carry interaction as well as motion: at IKTVA 2025
              it was combined with a transparent touchscreen interface so attendees could choose themed content
              (Environmental, Social, Governance) and explore Aramco&apos;s ESG initiatives.
            </p>
          </div>
          <div className="stack" style={{ ["--stack" as string]: "0.75rem" }}>
            <h2>Suitable applications</h2>
            <p className="muted">
              Exhibition stands and show floors where a moving centrepiece should carry a brand story: aviation,
              healthcare, real estate, technology and energy events. See the delivered projects below.
            </p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <h2>See it in action</h2>
        <div style={{ marginTop: 20 }}>
          <Placeholder title="Real demonstration video" note="Demo footage of Tri-Helix to be supplied and approved" style={{ minHeight: 280 }} />
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <h2>Specifications</h2>
        <div style={{ marginTop: 16 }}>
          <ReviewNote>
            No specifications are published. Confirm dimensions, module sizes, pixel pitch, power and transport details
            before listing anything here. Nothing has been assumed.
          </ReviewNote>
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <h2>Related projects</h2>
        <ul className="tech-grid" style={{ marginTop: 20 }}>
          {related.map((p) => (
            <li key={p!.slug} className="panel tech-item">
              <p className="eyebrow">{p!.location} · {p!.year}</p>
              <h3 style={{ marginTop: 6 }}>{p!.title}</h3>
              <p className="muted" style={{ marginTop: 8, fontSize: "0.92rem" }}>{p!.summary}</p>
              <Link href={p!.caseStudy ? `/work/${p!.slug}` : "/work"} className="accent" style={{ marginTop: "auto", paddingTop: 14 }}>
                {p!.caseStudy ? "Read case study →" : "View in Work →"}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
