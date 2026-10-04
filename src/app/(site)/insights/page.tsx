import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/Photo";
import { JsonLd } from "@/components/JsonLd";
import { getContent } from "@/lib/content/load";
import { breadcrumbLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/insights", pageKey: "insights", title: "Insights", description: "Project stories, technology explainers and guidance from Enginious." });
}

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "");

export default async function Insights() {
  const c = await getContent();
  const [lead, ...rest] = c.articles;
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Insights", path: "/insights" }])} />
      <section className="container" style={{ paddingBlock: "clamp(32px, 6vw, 80px)" }}>
        <p className="eyebrow">Insights</p>
        <h1 style={{ marginTop: 12, maxWidth: "14ch" }}>Stories and guidance.</h1>
        <p className="lede" style={{ marginTop: "1.25rem", maxWidth: "62ch" }}>Project stories, technology explainers and behind-the-scenes engineering from the Enginious team.</p>
      </section>
      <section className="container section" style={{ paddingTop: 0 }}>
        {!lead ? (
          <div className="panel" style={{ padding: 28, maxWidth: 640 }}>
            <h2 style={{ fontSize: "1.3rem" }}>No articles have been published yet.</h2>
            <p className="muted" style={{ marginTop: 8 }}>Project stories and technology explainers will appear here. In the meantime, see our <Link href="/work" className="accent">work</Link> or <Link href="/technologies" className="accent">technologies</Link>.</p>
          </div>
        ) : (
          <ul className="tech-grid" style={{ ["--min" as string]: "320px" }}>
            {[lead, ...rest].map((a) => (
              <li key={a.slug} className="panel tech-item" style={{ overflow: "hidden" }}>
                {a.cover && <div style={{ aspectRatio: "16 / 9", position: "relative", margin: "-1px -1px 14px", overflow: "hidden" }}><Photo id={a.cover} sizes="(max-width: 700px) 100vw, 400px" /></div>}
                <p className="eyebrow">{[a.category, fmt(a.publishedOn)].filter(Boolean).join(" · ")}</p>
                <h2 style={{ marginTop: 6, fontSize: "1.25rem" }}><Link href={`/insights/${a.slug}`}>{a.title}</Link></h2>
                <p className="muted" style={{ marginTop: 8, fontSize: "0.94rem" }}>{a.excerpt}</p>
                <Link href={`/insights/${a.slug}`} className="accent" style={{ marginTop: "auto", paddingTop: 14 }}>Read →</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
