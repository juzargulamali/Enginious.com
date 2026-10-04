"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MAP } from "@/content/map";
import { OFFICES, PLACES_DATA, PROJECT_PLACES, type Place } from "@/content/places";
import { projectBySlug } from "@/content/projects";
import { Trace } from "@/components/neon/Trace";

type ViewKey = "world" | "gulf" | "europe";
const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "world", label: "World" },
  { key: "gulf", label: "Gulf" },
  { key: "europe", label: "Europe" },
];
const W = MAP.width, H = MAP.height;
const RM = "(prefers-reduced-motion: reduce)";
const subRM = (cb: () => void) => { const m = window.matchMedia(RM); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const useReducedMotion = () => useSyncExternalStore(subRM, () => window.matchMedia(RM).matches, () => false);
const P = (id: string): [number, number] => {
  const p = (MAP.points as Record<string, readonly [number, number]>)[id];
  return [(p[0] / 100) * W, (p[1] / 100) * H];
};

/**
 * Two layers on real geography: OFFICES (solid diamonds) and PROJECT LOCATIONS (rings; dashed when only the country is known).
 * Markers are real buttons (keyboard + screen readers) and every place also appears in a readable list below the map.
 * Intro: offices appear first, then project locations, once, when the map scrolls into view; then it is all user control.
 */
export function PlacesMap() {
  const root = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState("dubai");
  const [view, setView] = useState<ViewKey>("world");
  const [layers, setLayers] = useState({ offices: true, projects: true });
  const reduced = useReducedMotion();
  const [introStage, setStage] = useState<0 | 1 | 2>(0); // 0 nothing yet, 1 offices, 2 offices + projects
  const stage = reduced ? 2 : introStage;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia(RM).matches) return;
    let t2 = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setStage(1);
      t2 = window.setTimeout(() => setStage(2), 1500);
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); window.clearTimeout(t2); };
  }, []);

  const v = MAP.views[view];
  const k = Math.min(100 / v.w, 100 / v.h);
  const tx = 50 - (v.x + v.w / 2) * k;
  const ty = 50 - (v.y + v.h / 2) * k;
  const place = PLACES_DATA.find((p) => p.id === sel)!;
  // World view is crowded around the Gulf, so only the selected place is named there (everything is in the list below).
  const showLabel = (p: Place) => p.id === sel || (view === "world" ? p.id === "poland" : true);

  const route: [number, number][] = useMemo(() => {
    const d = P("dubai"), r = P("riyadh"), pl = P("poland");
    return [d, r, [r[0] - 26, r[1] - 26], [pl[0] + 36, r[1] - 26], [pl[0], r[1] - 98], pl];
  }, []);

  const pick = (id: string) => {
    setSel(id);
    const p = PLACES_DATA.find((x) => x.id === id)!;
    if (view === "world" && p.group !== "world") setView(p.group === "gulf" ? "gulf" : "europe");
  };

  return (
    <div ref={root} className="pm" data-stage={stage} data-trace-scope>
      <div className="pm-bar">
        <div role="group" aria-label="Map view" className="pm-chips">
          {VIEWS.map((x) => <button key={x.key} type="button" className="chip" aria-pressed={view === x.key} onClick={() => setView(x.key)}>{x.label}</button>)}
        </div>
        <div role="group" aria-label="Map layers" className="pm-chips">
          <button type="button" className="chip" aria-pressed={layers.offices} onClick={() => setLayers((l) => ({ ...l, offices: !l.offices }))}><i className="key-o" aria-hidden="true" /> Offices</button>
          <button type="button" className="chip" aria-pressed={layers.projects} onClick={() => setLayers((l) => ({ ...l, projects: !l.projects }))}><i className="key-p" aria-hidden="true" /> Project locations</button>
        </div>
      </div>

      <div className="pm-grid">
        <div className="pm-frame">
          <div className="pm-stage" style={{ aspectRatio: `${W} / ${H}`, transform: `translate(${tx}%, ${ty}%) scale(${k})`, ["--k" as string]: k }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="pm-land" src="/art/map-land.svg" alt="" width={W} height={H} decoding="async" loading="lazy" />
            {layers.offices && <Trace points={route} w={W} h={H} duration={7000} nodes={[]} className="pm-trace" />}
            {PLACES_DATA.map((p) => {
              const pos = (MAP.points as Record<string, readonly [number, number]>)[p.id];
              const office = !!p.office;
              const visible = office ? layers.offices && stage >= 1 : layers.projects && stage >= 2;
              return (
                <button
                  key={p.id}
                  type="button"
                  className="pm-mk"
                  data-kind={office ? "office" : "project"}
                  data-precision={p.precision}
                  data-on={sel === p.id || undefined}
                  data-show={visible || undefined}
                  data-label={showLabel(p) || undefined}
                  tabIndex={visible ? 0 : -1}
                  aria-hidden={visible ? undefined : true}
                  aria-pressed={sel === p.id}
                  aria-label={`${p.name}${office ? `, ${p.office!.label}` : ""}${p.project ? ", project location" : ""}${p.precision === "country" ? ", country level" : ""}`}
                  style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }}
                  onClick={() => pick(p.id)}
                >
                  <span className="shape" aria-hidden="true" />
                  <span className="lab" aria-hidden="true">{office ? `${p.name} · ${p.office!.role === "hq" ? "HQ" : p.office!.region === "europe" ? "Europe" : "Branch"}` : p.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="pm-panel" aria-live="polite" key={place.id}>
          <p className="eyebrow">{place.country}{place.precision === "country" ? " · country level" : ""}</p>
          <h3>{place.name}</h3>
          <div className="pm-badges">
            {place.office && <span className="bdg bdg-o"><i className="key-o" aria-hidden="true" />{place.office.role === "hq" ? "Office" : "Office"} · {place.office.label}</span>}
            {place.project && <span className="bdg bdg-p"><i className="key-p" aria-hidden="true" />Project location</span>}
          </div>
          {place.office?.note && <p className="muted pm-note">{place.office.note}</p>}
          {place.office && (
            <Link href={`/contact?region=${place.office.region}`} className="btn btn-primary">Start a project with this team →</Link>
          )}
          {place.project && (
            <div className="pm-related">
              <p className="eyebrow">Delivered projects</p>
              {place.related?.length ? (
                <ul>
                  {place.related.map((s) => { const p = projectBySlug(s); return p ? <li key={s}><Link href={p.caseStudy ? `/work/${p.slug}` : `/work#${p.slug}`}>{p.title}<span>{p.year}</span></Link></li> : null; })}
                </ul>
              ) : (
                <p className="muted">Project details are being added.</p>
              )}
              {place.relatedNote && place.related?.length ? <p className="muted pm-note">{place.relatedNote}</p> : null}
            </div>
          )}
        </aside>
      </div>

      <div className="pm-list">
        <div>
          <h4>Offices</h4>
          <ul>{OFFICES.map((p) => <li key={p.id}><button type="button" className="pm-li" aria-pressed={sel === p.id} onClick={() => pick(p.id)}><i className="key-o" aria-hidden="true" /><b>{p.name}</b><span>{p.office!.label}</span></button></li>)}</ul>
        </div>
        <div>
          <h4>Project locations</h4>
          <ul className="pm-cols">{PROJECT_PLACES.map((p) => <li key={p.id}><button type="button" className="pm-li" aria-pressed={sel === p.id} onClick={() => pick(p.id)}><i className={p.precision === "country" ? "key-pc" : "key-p"} aria-hidden="true" /><b>{p.name}</b>{p.precision === "country" && <span>Country</span>}</button></li>)}</ul>
        </div>
      </div>
    </div>
  );
}
