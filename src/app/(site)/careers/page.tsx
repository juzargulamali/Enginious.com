import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { getContent } from "@/lib/content/load";
import { breadcrumbLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({ path: "/careers", pageKey: "careers", title: "Careers", description: "Careers and internships at Enginious." });
}

export default async function Careers() {
  const c = await getContent();
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }])} />
      <section className="container" style={{ paddingBlock: "clamp(32px, 6vw, 80px)" }}>
        <p className="eyebrow">Careers</p>
        <h1 style={{ marginTop: 12, maxWidth: "14ch" }}>Build what comes next.</h1>
        <p className="lede" style={{ marginTop: "1.25rem", maxWidth: "62ch" }}>Enginious is a team of engineers, creative artists and designers working across Dubai, Saudi Arabia and Poland.</p>
      </section>
      <section className="container section" style={{ paddingTop: 0 }}>
        {c.roles.length === 0 ? (
          <div className="panel" style={{ padding: 28, maxWidth: 640 }}>
            <h2 style={{ fontSize: "1.3rem" }}>There are no open vacancies at the moment.</h2>
            <p className="muted" style={{ marginTop: 8 }}>New roles are listed here as they open. You are welcome to <Link href="/contact" className="accent">get in touch</Link> to introduce yourself.</p>
          </div>
        ) : (
          <ul className="tech-grid" style={{ ["--min" as string]: "320px" }}>
            {c.roles.map((r) => (
              <li key={r.slug} className="panel tech-item">
                <p className="eyebrow">{[r.department, r.location].filter(Boolean).join(" · ")}</p>
                <h2 style={{ marginTop: 6, fontSize: "1.25rem" }}><Link href={`/careers/${r.slug}`}>{r.title}</Link></h2>
                {r.employmentType && <p className="muted" style={{ marginTop: 6, fontSize: "0.9rem", textTransform: "capitalize" }}>{r.employmentType.replace("-", " ")}</p>}
                <Link href={`/careers/${r.slug}`} className="accent" style={{ marginTop: "auto", paddingTop: 14 }}>View role →</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
