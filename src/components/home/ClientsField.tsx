"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Photo } from "@/components/Photo";
import { CLIENTS, hasConfirmedRelationships, type Client } from "@/content/clients";
import { IMAGES } from "@/content/images";
import { projectBySlug } from "@/content/projects";

/**
 * "Connected through experience": a field of client nodes joined by restrained neon paths. Selecting a node brings it into
 * focus and reveals confirmed related work, its location and a project link. Logos are shown only when an approved logo
 * file is registered (natural proportions, never cropped or approximated); until then the node is the client's name in plain type.
 * Direct clients and agency partners are distinguished only for entries whose relationship is confirmed.
 * Phones: a swipeable strip with the story underneath.
 */
export function ClientsField() {
  const [sel, setSel] = useState(CLIENTS.findIndex((c) => c.id === "etihad"));
  const strip = useRef<HTMLUListElement>(null);
  const c: Client = CLIENTS[sel];
  const related = c.projects.map(projectBySlug).filter((p) => !!p);
  const pick = (i: number) => setSel(i);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setSel((s) => (s + 1) % CLIENTS.length); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setSel((s) => (s - 1 + CLIENTS.length) % CLIENTS.length); }
  };

  return (
    <div className="cl">
      {hasConfirmedRelationships && (
        <p className="cl-legend" aria-hidden="true"><i className="d" /> Direct client <i className="a" /> Agency partner</p>
      )}
      <div className="cl-field" data-trace-scope>
        <svg className="cl-paths" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 150 C 140 40, 260 40, 400 150 S 660 260, 800 150 S 940 60, 1000 120" />
          <path d="M0 220 C 160 300, 300 290, 450 210 S 700 90, 860 200 S 960 270, 1000 230" opacity=".6" />
          <path d="M0 80 C 120 150, 240 160, 380 90 S 640 20, 780 90 S 930 170, 1000 60" opacity=".45" />
        </svg>
        <ul ref={strip} className="cl-nodes" role="listbox" aria-label="Clients" onKeyDown={onKey}>
          {CLIENTS.map((x, i) => {
            const logo = x.logo ? IMAGES[x.logo] : undefined;
            return (
              <li key={x.id} role="presentation">
                <button type="button" role="option" aria-selected={i === sel} tabIndex={i === sel ? 0 : -1} className="cl-node" data-on={i === sel || undefined} data-rel={x.relationship} onClick={() => pick(i)} onFocus={() => pick(i)}>
                  {logo ? <span className="logo"><Photo id={logo.id} sizes="140px" label={false} style={{ objectFit: "contain" }} /></span> : <span className="nm">{x.name}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="cl-story" aria-live="polite" key={c.id}>
        <p className="eyebrow">Selected client</p>
        <h3>{c.name}</h3>
        {related.length === 0 ? (
          <p className="muted">Related projects are being added.</p>
        ) : (
          <ul>
            {related.map((p) => (
              <li key={p!.slug}>
                <Link href={p!.caseStudy ? `/work/${p!.slug}` : `/work#${p!.slug}`}>
                  <b>{p!.title}</b>
                  <span>{p!.location} · {p!.year}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
