"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Photo } from "@/components/Photo";
import { useContent } from "@/components/ContentProvider";
import type { Client } from "@/content/clients";

/**
 * "Connected through experience": a curated constellation, not a field of equal pills.
 * Eight to nine featured clients (those with the most delivered projects, then the order of the Company Profile) hang at three depths:
 * near ones large and bright, far ones small and dim. Selecting one brings it forward in place (it never moves under the pointer),
 * lights the lines to its neighbours and radiates to the projects delivered together, each a link. "Browse all clients" opens every
 * name as a plain list; selecting one there shows it in the centre of the constellation.
 * Logos are shown only when an approved logo file is registered (natural proportions, never cropped); until then each node is the
 * client's name in plain type. Direct clients and agency partners are distinguished only where the relationship is confirmed.
 * Phones: a swipeable strip of the same featured clients, with the story underneath.
 */
// slots in a 1000 x 460 canvas. t = depth tier (0 near, 1 middle, 2 far). Slot 0 is the centre, reserved for a client picked from the full list.
const SLOTS: { x: number; y: number; t: 0 | 1 | 2 }[] = [
  { x: 50, y: 50, t: 0 }, { x: 24, y: 36, t: 1 }, { x: 77, y: 31, t: 1 }, { x: 12, y: 70, t: 2 }, { x: 35, y: 78, t: 1 },
  { x: 66, y: 80, t: 1 }, { x: 89, y: 62, t: 2 }, { x: 33, y: 13, t: 2 }, { x: 62, y: 11, t: 2 },
];
const EDGES: [number, number][] = [[0, 1], [0, 2], [0, 4], [0, 5], [1, 7], [2, 8], [1, 3], [3, 4], [5, 6], [2, 6], [7, 8]];
const TIER = [{ s: 1.18, o: 1 }, { s: 1, o: 0.86 }, { s: 0.84, o: 0.62 }];
const U = (x: number, y: number): [number, number] => [x * 10, y * 4.6];
/** Project stars fan out from their client towards the middle of the canvas (never off the edge), 110 units away. */
function stars(cx: number, cy: number, n: number): [number, number][] {
  const toMid = Math.hypot(500 - cx, 230 - cy) < 70 ? -Math.PI / 2 : Math.atan2(230 - cy, 500 - cx);
  return Array.from({ length: n }, (_, i) => {
    const a = toMid + (i - (n - 1) / 2) * 0.78;
    return [Math.min(940, Math.max(60, cx + Math.cos(a) * 150)), Math.min(425, Math.max(36, cy + Math.sin(a) * 105))] as [number, number];
  });
}

export function ClientsField() {
  const { clients: CLIENTS, projectBySlug, imageById, hasConfirmedRelationships } = useContent();
  const [sel, setSel] = useState(() => Math.max(0, CLIENTS.findIndex((c) => c.id === "etihad")));
  const [all, setAll] = useState(false);

  // curate: most delivered projects first, stable on the order of the Company Profile
  const curated = useMemo(() => CLIENTS.map((c, i) => ({ c, i })).sort((a, b) => b.c.projects.length - a.c.projects.length || a.i - b.i).map((x) => x.c), [CLIENTS]);
  if (CLIENTS.length === 0) return null;
  const c: Client = CLIENTS[Math.min(sel, CLIENTS.length - 1)];
  const related = c.projects.map(projectBySlug).filter((p) => !!p);
  const f8 = curated.slice(0, SLOTS.length - 1);
  // slot 0 (the centre) shows the client picked from the full list when it is not one of the eight featured; otherwise the next one
  const centre = f8.some((f) => f.id === c.id) ? curated[SLOTS.length - 1] : c;
  const placed: (Client | undefined)[] = [centre, ...f8];
  const where = Math.max(0, placed.findIndex((p) => p?.id === c.id));
  const [cx, cy] = U(SLOTS[where].x, SLOTS[where].y);
  const pick = (id: string) => setSel(Math.max(0, CLIENTS.findIndex((x) => x.id === id)));
  const nodeFor = (x: Client, k: number) => {
    const logo = x.logo ? imageById(x.logo) : undefined;
    const on = x.id === c.id;
    const t = SLOTS[k].t;
    return (
      <button
        key={x.id}
        type="button"
        className="cn-node"
        aria-pressed={on}
        data-on={on || undefined}
        data-rel={x.relationship}
        style={{ left: `${SLOTS[k].x}%`, top: `${SLOTS[k].y}%`, ["--s" as string]: on ? TIER[0].s * 1.15 : TIER[t].s, ["--o" as string]: on ? 1 : TIER[t].o, zIndex: on ? 5 : 3 - t }}
        onClick={() => pick(x.id)}
      >
        <i aria-hidden="true" />
        {logo ? <span className="logo"><Photo id={logo.id} sizes="140px" label={false} style={{ objectFit: "contain" }} /></span> : <span className="nm">{x.name}</span>}
      </button>
    );
  };

  return (
    <div className="cl">
      {hasConfirmedRelationships && (
        <p className="cl-legend" aria-hidden="true"><i className="d" /> Direct client <i className="a" /> Agency partner</p>
      )}

      {/* desktop and tablet: the constellation */}
      <div className="cn" data-trace-scope>
        <svg className="cn-lines" viewBox="0 0 1000 460" preserveAspectRatio="none" aria-hidden="true">
          {EDGES.map(([a, b]) => {
            const [x1, y1] = U(SLOTS[a].x, SLOTS[a].y), [x2, y2] = U(SLOTS[b].x, SLOTS[b].y);
            const lit = a === where || b === where;
            return <path key={`${a}-${b}`} d={`M${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 - 22} ${x2} ${y2}`} data-lit={lit || undefined} />;
          })}
          {stars(cx, cy, related.length).map(([sx, sy], i) => <line key={related[i]!.slug} className="cn-ray" x1={cx} y1={cy} x2={sx} y2={sy} />)}
        </svg>
        {placed.map((x, k) => (x ? nodeFor(x, k) : null))}
        {stars(cx, cy, related.length).map(([px, py], i) => {
          const p = related[i]!;
          return (
            <Link key={p.slug} href={p.caseStudy ? `/work/${p.slug}` : `/work#${p.slug}`} className="cn-star" style={{ left: `${(px / 1000) * 100}%`, top: `${(py / 460) * 100}%` }}>
              <i aria-hidden="true" /><span>{p.title}</span>
            </Link>
          );
        })}
      </div>

      {/* phones: a swipeable strip of the featured clients */}
      <ul className="cn-strip" aria-label="Featured clients">
        {placed.filter((x): x is Client => !!x).map((x) => (
          <li key={x.id}><button type="button" className="chip" aria-pressed={x.id === c.id} onClick={() => pick(x.id)}>{x.name}</button></li>
        ))}
      </ul>

      <div className="cn-browse">
        <button type="button" className="btn" aria-expanded={all} aria-controls="cn-all" onClick={() => setAll((v) => !v)}>
          {all ? "Hide the full list" : `Browse all ${CLIENTS.length} clients`}
        </button>
        {all && (
          <ul id="cn-all" className="cn-all">
            {CLIENTS.map((x) => (
              <li key={x.id}><button type="button" aria-pressed={x.id === c.id} onClick={() => pick(x.id)} data-rel={x.relationship}>{x.name}</button></li>
            ))}
          </ul>
        )}
      </div>

      <div className="cl-story" aria-live="polite" key={c.id}>
        <p className="eyebrow">Selected client</p>
        <h3>{c.name}</h3>
        {c.relationship !== "unconfirmed" && c.attribution && <p className="muted">{c.attribution}</p>}
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
