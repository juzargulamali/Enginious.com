"use client";

import Link from "next/link";
import type { Project } from "@/content/projects";
import { useContent } from "./ContentProvider";
import { CardMedia } from "./video/CardMedia";
import { PreviewProvider } from "./video/PreviewProvider";

/** Project cards for a regional page: media (with the card preview) only where the project has an image or a video, always a link to the project page. */
export function RegionProjects({ projects, all }: { projects: Project[]; all: string }) {
  const { techBySlug } = useContent();
  return (
    <PreviewProvider>
      <ul className="tech-grid" style={{ ["--min" as string]: "300px", marginTop: 28 }}>
        {projects.map((p) => (
          <li key={p.slug} className="panel tech-item" style={{ padding: 14 }} data-vcard>
            <CardMedia id={`region-${p.slug}`} title={p.title} video={p.video} posterImageId={p.media?.[0]} />
            <p className="eyebrow" style={{ marginTop: 14 }}>{p.location}{p.year ? ` · ${p.year}` : ""}</p>
            <h3 style={{ marginTop: 6 }}><Link href={`/work/${p.slug}`}>{p.title}</Link></h3>
            {p.client && <p className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>Client: {p.client}</p>}
            <p className="muted" style={{ marginTop: 8, fontSize: "0.92rem" }}>{p.summary}</p>
            {p.technologies.length > 0 && (
              <p style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {p.technologies.map((s) => { const t = techBySlug(s); return t ? <Link key={s} href={`/technologies/${s}`} className="chip" style={{ minHeight: 28, padding: "0 .6rem", fontSize: ".76rem" }}>{t.name}</Link> : null; })}
              </p>
            )}
            <div style={{ marginTop: "auto", paddingTop: 14 }}><Link href={`/work/${p.slug}`} className="accent">View project →</Link></div>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 22 }}><Link href={all} className="btn">All projects →</Link></p>
    </PreviewProvider>
  );
}
