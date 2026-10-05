import type { Metadata } from "next";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { JsonLd } from "@/components/JsonLd";
import { getContent } from "@/lib/content/load";
import { breadcrumbLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/solutions", pageKey: "solutions", title: "Solutions", description: "What you can commission from Enginious: experiential technology, content, software and engineering." });
}

export default async function Solutions() {
  const c = await getContent();
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Solutions", path: "/solutions" }])} />
      <section className="container" style={{ paddingBlock: "clamp(32px, 6vw, 80px)" }}>
        <p className="eyebrow">Solutions</p>
        <h1 style={{ marginTop: 12, maxWidth: "16ch" }}>What you can commission.</h1>
        <p className="lede" style={{ marginTop: "1.25rem", maxWidth: "62ch" }}>Enginious combines strategy, content, software, hardware and integration in one team.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
          <Link href="/contact" className="btn btn-primary">Start a project →</Link>
          <Link href="/technologies" className="btn">Explore technologies</Link>
        </div>
      </section>
      <section className="container section" style={{ paddingTop: 0 }}>
        <div style={{ display: "grid", gap: 20 }}>
          {c.solutions.map((s) => {
            const techs = s.technologies.map((t) => c.technologies.find((x) => x.slug === t)).filter((t): t is NonNullable<typeof t> => !!t);
            const projects = s.projects.map((t) => c.projects.find((x) => x.slug === t)).filter((t): t is NonNullable<typeof t> => !!t);
            return (
              <article key={s.slug} id={s.slug} className="panel" style={{ padding: "clamp(20px, 3vw, 32px)" }}>
                <h2 style={{ fontSize: "clamp(1.3rem, 2.4vw, 1.9rem)" }}>{s.title}</h2>
                <p className="muted" style={{ marginTop: 10, maxWidth: "70ch" }}>{s.summary}</p>
                {s.body && <div style={{ marginTop: 14, maxWidth: "70ch" }}><Markdown source={s.body} /></div>}
                {s.benefits.length > 0 && <ul style={{ marginTop: 14, paddingLeft: "1.2rem" }}>{s.benefits.map((b) => <li key={b}>{b}</li>)}</ul>}
                {s.process.length > 0 && <ol style={{ marginTop: 14, paddingLeft: "1.2rem" }}>{s.process.map((p) => <li key={p.title}><b>{p.title}</b>{p.body ? `: ${p.body}` : ""}</li>)}</ol>}
                {(techs.length > 0 || projects.length > 0) && (
                  <p style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {techs.map((t) => <Link key={t.slug} href={`/technologies/${t.slug}`} className="chip" style={{ minHeight: 30, padding: "0 .7rem", fontSize: ".8rem" }}>{t.name}</Link>)}
                    {projects.map((p) => <Link key={p.slug} href={`/work/${p.slug}`} className="chip" style={{ minHeight: 30, padding: "0 .7rem", fontSize: ".8rem" }}>{p.title}</Link>)}
                  </p>
                )}
              </article>
            );
          })}
          {c.solutions.length === 0 && <p className="muted">Our services will be listed here soon. <Link href="/contact" className="accent">Tell us what you need →</Link></p>}
        </div>
      </section>
    </>
  );
}
