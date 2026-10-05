import { VideoPlayer } from "@/components/video/VideoPlayer";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExperienceTabs } from "@/components/ExperienceTabs";
import { JsonLd } from "@/components/JsonLd";
import { Markdown } from "@/components/Markdown";
import { Photo } from "@/components/Photo";
import { getContent } from "@/lib/content/load";
import { breadcrumbLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateStaticParams() {
  return (await getContent()).projects.map((p) => ({ slug: p.slug })); // every published project has a page; new CMS items render on demand
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getContent()).projects.find((x) => x.slug === slug);
  if (!p) return { title: "Not found", robots: { index: false } };
  return buildMetadata({ path: `/work/${p.slug}`, title: p.caseStudy ? `${p.title}: case study` : p.title, description: p.summary, seo: p.seo, image: p.media?.[0] });
}

const CHAPTERS = [["overview", "Overview"], ["video", "Video"], ["challenge", "Challenge"], ["experience", "The experience"], ["scope", "Scope"], ["media", "Media"]] as const;

export default async function CaseStudy({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const c = await getContent();
  const p = c.projects.find((x) => x.slug === slug);
  if (!p) notFound(); // unpublished and archived items are not in the content at all
  const techs = p.technologies.map((s) => c.technologies.find((t) => t.slug === s)).filter((t): t is NonNullable<typeof t> => !!t);
  const media = (p.media ?? []).filter((id) => c.images[id]);
  const more = c.projects.filter((x) => x.slug !== p.slug && x.region === p.region).slice(0, 3);
  const chapters = CHAPTERS.filter(([id]) => id === "overview" || (id === "video" && !!p.video) || (id === "scope" && (techs.length > 0 || (p.outcomes?.length ?? 0) > 0)) || (id === "media" && media.length > 0) || (id === "challenge" && p.challenge) || (id === "experience" && (p.experience || p.slug === "whx")));

  return (
    <article className="container section" style={{ paddingTop: "clamp(24px, 4vw, 56px)" }}>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Work", path: "/work" }, { name: p.title, path: `/work/${p.slug}` }])} />
      <nav aria-label="Breadcrumb" className="muted" style={{ fontSize: "0.85rem" }}>
        <Link href="/work">Work</Link> / <span aria-current="page" style={{ color: "#fff" }}>{p.title}</span>
      </nav>

      <header id="overview" style={{ marginTop: 24 }}>
        <p className="eyebrow">{p.caseStudy ? "Case study · Completed project" : "Completed project"}</p>
        <h1 style={{ marginTop: 12, maxWidth: "16ch" }}>{p.title}</h1>
        <p className="lede" style={{ marginTop: 14, maxWidth: "62ch" }}>{p.summary}</p>
        <dl className="facts">
          {p.client && <div><dt>Client</dt><dd>{p.client}</dd></div>}
          {p.clientAttribution && <div><dt>Delivered</dt><dd>{p.clientAttribution}</dd></div>}
          {p.event && <div><dt>Event</dt><dd>{p.event}</dd></div>}
          {p.location && <div><dt>Location</dt><dd>{p.location}</dd></div>}
          {p.year > 0 && <div><dt>Year</dt><dd>{p.year}</dd></div>}
          {p.sector && <div><dt>Sector</dt><dd>{p.sector}</dd></div>}
        </dl>
      </header>

      <div className="case-grid">
        <nav aria-label="Chapters" className="chapters">
          {chapters.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>

        <div className="stack" style={{ ["--stack" as string]: "3.2rem" }}>
          {p.video && (
            <section id="video" className="stack" style={{ ["--stack" as string]: "0.8rem" }} aria-label="Project video">
              <VideoPlayer video={p.video} title={p.title} posterImageId={p.media?.[0]} />
            </section>
          )}
          {p.challenge && (
            <section id="challenge" className="stack" style={{ ["--stack" as string]: "0.8rem" }}>
              <h2>The challenge</h2>
              <div className="lede"><Markdown source={p.challenge} /></div>
            </section>
          )}

          {(p.experience || p.slug === "whx") && (
            <section id="experience" className="stack" style={{ ["--stack" as string]: "1rem" }}>
              <h2>The experience</h2>
              {p.experience && <div className="muted"><Markdown source={p.experience} /></div>}
              {p.slug === "whx" && (
                <>
                  <p className="muted">Two experiences were delivered:</p>
                  <ExperienceTabs />
                  <p className="muted">The activation showed how kinetic and motion-driven displays can elevate healthcare communication, turning static content into a more engaging and memorable experience.</p>
                </>
              )}
            </section>
          )}

          {(techs.length > 0 || (p.outcomes?.length ?? 0) > 0) && (
          <section id="scope" className="stack" style={{ ["--stack" as string]: "0.8rem" }}>
            <h2>Enginious&apos;s scope</h2>
            {techs.length > 0 && (
              <ul style={{ display: "flex", gap: 8, flexWrap: "wrap", listStyle: "none", padding: 0 }}>
                {techs.map((t) => (
                  <li key={t.slug}><Link href={`/technologies/${t.slug}`} className="chip">{t.name}</Link></li>
                ))}
              </ul>
            )}
            {p.outcomes && p.outcomes.length > 0 && (
              <>
                <h3 style={{ marginTop: 18 }}>Confirmed results</h3>
                <dl className="facts">{p.outcomes.map((o) => <div key={o.label}><dt>{o.label}</dt><dd>{o.value}{o.source ? <span className="muted"> · {o.source}</span> : null}</dd></div>)}</dl>
              </>
            )}
          </section>
          )}

          {media.length > 0 && (
          <section id="media" className="stack" style={{ ["--stack" as string]: "1rem" }}>
            <h2>Media</h2>
            <div className="three">{media.map((id) => <div key={id} style={{ position: "relative", aspectRatio: "4 / 3", overflow: "hidden", borderRadius: 12 }}><Photo id={id} sizes="(max-width: 900px) 100vw, 400px" /></div>)}</div>
          </section>
          )}

          {more.length > 0 && (
            <section className="stack" style={{ ["--stack" as string]: "1rem" }} aria-label="More projects">
              <h2>More projects{p.region === "uae" ? " in the UAE" : p.region === "ksa" ? " in Saudi Arabia" : ""}</h2>
              <ul className="tech-grid" style={{ ["--min" as string]: "220px" }}>
                {more.map((m) => (
                  <li key={m.slug} className="panel tech-item">
                    <p className="eyebrow">{m.location}{m.year ? ` · ${m.year}` : ""}</p>
                    <h3 style={{ marginTop: 6, fontSize: "1.1rem" }}><Link href={`/work/${m.slug}`}>{m.title}</Link></h3>
                    <p style={{ marginTop: "auto", paddingTop: 12 }}><Link href={`/work/${m.slug}`} className="accent">View project →</Link></p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel" style={{ padding: "clamp(20px, 3vw, 36px)" }}>
            <h2 style={{ fontSize: "1.6rem" }}>Planning something similar?</h2>
            <p className="muted" style={{ margin: "10px 0 18px" }}>Add the technologies you liked to your brief and talk to the team.</p>
            <Link href={techs[0] ? `/contact?tech=${techs[0].slug}` : "/contact"} className="btn btn-primary">Start a project →</Link>
          </section>
        </div>
      </div>
    </article>
  );
}
