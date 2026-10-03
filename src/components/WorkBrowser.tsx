"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PROJECTS, type Region3 } from "@/content/projects";
import { TECHNOLOGIES } from "@/content/technologies";
import { Placeholder } from "./Placeholder";

const REGION_LABEL: Record<Region3 | "all", string> = { all: "All regions", uae: "UAE", ksa: "Saudi Arabia", international: "International" };

/** Only filters supported by the content: region, sector and technology (technology only where recorded). */
export function WorkBrowser() {
  const [region, setRegion] = useState<Region3 | "all">("all");
  const [sector, setSector] = useState<string>("all");
  const sectors = useMemo(() => [...new Set(PROJECTS.map((p) => p.sector))].sort(), []);
  const list = PROJECTS.filter((p) => (region === "all" || p.region === region) && (sector === "all" || p.sector === sector));

  return (
    <>
      <div style={{ display: "grid", gap: 14, margin: "2rem 0" }}>
        <div role="group" aria-label="Filter by region" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(Object.keys(REGION_LABEL) as (Region3 | "all")[]).map((r) => (
            <button key={r} type="button" className="chip" aria-pressed={region === r} onClick={() => setRegion(r)}>{REGION_LABEL[r]}</button>
          ))}
        </div>
        <div role="group" aria-label="Filter by sector" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="chip" aria-pressed={sector === "all"} onClick={() => setSector("all")}>All sectors</button>
          {sectors.map((s) => (
            <button key={s} type="button" className="chip" aria-pressed={sector === s} onClick={() => setSector(s)}>{s}</button>
          ))}
        </div>
      </div>
      <p className="muted" role="status" style={{ marginBottom: 16 }}>{list.length} project{list.length === 1 ? "" : "s"}</p>
      <ul className="tech-grid" style={{ ["--min" as string]: "300px" }}>
        {list.map((p) => (
          <li key={p.slug} id={p.slug} className="panel tech-item" style={{ padding: 14 }}>
            <Placeholder title="Project media" note="Approved photography / video to be supplied" style={{ minHeight: 150 }} />
            <p className="eyebrow" style={{ marginTop: 14 }}>{p.location} · {p.year}</p>
            <h3 style={{ marginTop: 6 }}>{p.title}</h3>
            {p.client && <p className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>Client: {p.client}</p>}
            <p className="muted" style={{ marginTop: 8, fontSize: "0.92rem" }}>{p.summary}</p>
            {p.technologies.length > 0 && (
              <p style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {p.technologies.map((s) => {
                  const t = TECHNOLOGIES.find((x) => x.slug === s)!;
                  return t.detailed ? (
                    <Link key={s} href={`/technologies/${s}`} className="chip" style={{ minHeight: 28, padding: "0 .6rem", fontSize: ".76rem" }}>{t.name}</Link>
                  ) : (
                    <span key={s} className="chip" style={{ minHeight: 28, padding: "0 .6rem", fontSize: ".76rem", cursor: "default" }}>{t.name}</span>
                  );
                })}
              </p>
            )}
            <div style={{ marginTop: "auto", paddingTop: 14 }}>
              {p.caseStudy ? (
                <Link href={`/work/${p.slug}`} className="accent">Read case study →</Link>
              ) : (
                <span className="muted" style={{ fontSize: "0.8rem" }}>Case study in preparation</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
