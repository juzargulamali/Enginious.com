import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExperienceTabs } from "@/components/ExperienceTabs";
import { Placeholder } from "@/components/Placeholder";
import { ReviewNote } from "@/components/ReviewNote";
import { PROJECTS, projectBySlug } from "@/content/projects";
import { techBySlug } from "@/content/technologies";

export const dynamicParams = false;
export function generateStaticParams() {
  return PROJECTS.filter((p) => p.caseStudy).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/work/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = projectBySlug(slug);
  if (!p) return {};
  return { title: `${p.title}: case study`, description: p.summary, alternates: { canonical: `/work/${p.slug}` } };
}

const CHAPTERS = [
  ["overview", "Overview"],
  ["challenge", "Challenge"],
  ["experience", "The experience"],
  ["scope", "Scope"],
  ["media", "Media"],
] as const;

export default async function CaseStudy({ params }: PageProps<"/work/[slug]">) {
  const { slug } = await params;
  const p = projectBySlug(slug);
  if (!p || !p.caseStudy) notFound();
  const techs = p.technologies.map(techBySlug).filter((t) => !!t);

  return (
    <article className="container section" style={{ paddingTop: "clamp(24px, 4vw, 56px)" }}>
      <nav aria-label="Breadcrumb" className="muted" style={{ fontSize: "0.85rem" }}>
        <Link href="/work">Work</Link> / <span aria-current="page" style={{ color: "#fff" }}>{p.title}</span>
      </nav>

      <header id="overview" style={{ marginTop: 24 }}>
        <p className="eyebrow">Case study · Completed project</p>
        <h1 style={{ marginTop: 12, maxWidth: "16ch" }}>{p.title}</h1>
        <dl className="facts">
          <div><dt>Client</dt><dd>{p.client}</dd></div>
          <div><dt>Event</dt><dd>{p.event}</dd></div>
          <div><dt>Location</dt><dd>{p.location}</dd></div>
          <div><dt>Year</dt><dd>{p.year}</dd></div>
          <div><dt>Sector</dt><dd>{p.sector}</dd></div>
        </dl>
      </header>

      <div className="case-grid">
        <nav aria-label="Chapters" className="chapters">
          {CHAPTERS.map(([id, label]) => (
            <a key={id} href={`#${id}`}>{label}</a>
          ))}
        </nav>

        <div className="stack" style={{ ["--stack" as string]: "3.2rem" }}>
          <section id="challenge" className="stack" style={{ ["--stack" as string]: "0.8rem" }}>
            <h2>The challenge</h2>
            <p className="lede">
              American Hospital needed to stand out within a busy exhibition environment, and to present healthcare
              content in a more fluid, intuitive way than static displays allow.
            </p>
          </section>

          <section id="experience" className="stack" style={{ ["--stack" as string]: "1rem" }}>
            <h2>The experience</h2>
            <p className="muted">
              Enginious delivered a dynamic installation integrating motion-based display technologies. Movement and
              form drew attention while content was presented in a more fluid and intuitive way. Two experiences were
              delivered:
            </p>
            <ExperienceTabs />
            <p className="muted">
              The activation showed how kinetic and motion-driven displays can elevate healthcare communication,
              turning static content into a more engaging and memorable experience.
            </p>
          </section>

          <section id="scope" className="stack" style={{ ["--stack" as string]: "0.8rem" }}>
            <h2>Enginious&apos;s scope</h2>
            <p className="muted">Motion-based display installation for American Hospital&apos;s presence at WHX.</p>
            <ul style={{ display: "flex", gap: 8, flexWrap: "wrap", listStyle: "none", padding: 0 }}>
              {techs.map((t) => (
                <li key={t!.slug}>
                  {t!.detailed ? <Link href={`/technologies/${t!.slug}`} className="chip">{t!.name}</Link> : <span className="chip" style={{ cursor: "default" }}>{t!.name}</span>}
                </li>
              ))}
            </ul>
            <ReviewNote>Detailed scope (content, delivery, operation) and any verified results have not been supplied, so none are claimed.</ReviewNote>
          </section>

          <section id="media" className="stack" style={{ ["--stack" as string]: "1rem" }}>
            <h2>Media</h2>
            <Placeholder title="Project video" note="Approved video to be supplied (profile links to a recording)" style={{ minHeight: 260 }} />
            <div className="three">
              {["Exhibition floor", "DNA XS", "Arc Shift"].map((t) => (
                <Placeholder key={t} title={t} note="Approved photography to be supplied" style={{ minHeight: 150 }} />
              ))}
            </div>
          </section>

          <section className="panel" style={{ padding: "clamp(20px, 3vw, 36px)" }}>
            <h2 style={{ fontSize: "1.6rem" }}>Planning something similar?</h2>
            <p className="muted" style={{ margin: "10px 0 18px" }}>Add the technologies you liked to your brief and talk to the team.</p>
            <Link href="/contact?tech=arc-shift" className="btn btn-primary">Start a project →</Link>
          </section>
        </div>
      </div>
    </article>
  );
}
