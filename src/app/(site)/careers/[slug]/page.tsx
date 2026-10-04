import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { JsonLd } from "@/components/JsonLd";
import { getContent } from "@/lib/content/load";
import { breadcrumbLd, jobPostingLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { toPlainText } from "@/lib/markdown";

export async function generateStaticParams() {
  return (await getContent()).roles.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = (await getContent()).roles.find((x) => x.slug === slug);
  if (!r) return { title: "Not found", robots: { index: false } };
  return buildMetadata({ path: `/careers/${r.slug}`, title: `${r.title} (${r.location})`, description: toPlainText(r.description, 160), seo: r.seo });
}

export default async function Role({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getContent();
  const r = c.roles.find((x) => x.slug === slug);
  if (!r) notFound();
  const apply = r.applyUrl ? { href: r.applyUrl, label: "Apply for this role" } : r.applyEmail ? { href: `mailto:${r.applyEmail}?subject=${encodeURIComponent(`Application: ${r.title}`)}`, label: `Apply by email` } : null;
  return (
    <>
      <JsonLd data={jobPostingLd(c, { title: r.title, description: toPlainText(r.description, 4000), location: r.location, path: `/careers/${r.slug}`, publishedAt: r.publishedAt, closesOn: r.closesOn, employmentType: r.employmentType })} />
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }, { name: r.title, path: `/careers/${r.slug}` }])} />
      <article className="container section" style={{ paddingTop: "clamp(32px, 6vw, 80px)", maxWidth: 820 }}>
        <p className="eyebrow"><Link href="/careers">Careers</Link>{r.department ? ` · ${r.department}` : ""}</p>
        <h1 style={{ marginTop: 12, fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>{r.title}</h1>
        <p className="muted" style={{ marginTop: 14 }}>{[r.location, r.employmentType?.replace("-", " "), r.closesOn ? `Closes ${r.closesOn}` : ""].filter(Boolean).join(" · ")}</p>
        <div style={{ marginTop: 24 }}><Markdown source={r.description} className="md prose" /></div>
        {r.requirements && <><h2 style={{ marginTop: 32, fontSize: "1.4rem" }}>Requirements</h2><Markdown source={r.requirements} className="md prose" /></>}
        <p style={{ marginTop: 36 }}>{apply && <a className="btn btn-primary" href={apply.href} {...(apply.href.startsWith("https") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{apply.label} →</a>} <Link href="/careers" className="btn">All roles</Link></p>
      </article>
    </>
  );
}
