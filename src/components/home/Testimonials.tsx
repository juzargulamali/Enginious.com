"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { Edge } from "@/components/neon/Edge";
import { TechForm } from "@/components/TechForm";
import type { Testimonial } from "@/content/testimonials";
import { useContent } from "@/components/ContentProvider";

const subscribe = () => () => {};
const wantsSamples = () => new URLSearchParams(window.location.search).get("samples") === "1";

/**
 * "The experience, in their words." One quote at a time in an illuminated frame beside related project media.
 * Light travels around the frame when a quote is selected; arrows, swipe and keys; never advances by itself.
 * Only PUBLISHED testimonials are shown. Fictional samples appear only on previews with ?samples=1, clearly marked "Sample".
 * With nothing to show, the whole section is omitted (no empty placeholder on the public page).
 */
export function Testimonials({ published, samples: sampleList }: { published: Testimonial[]; samples: Testimonial[] }) {
  // `samples` is empty on production builds (decided on the server), so fictional text is not even shipped there.
  const { projectBySlug, techBySlug } = useContent();
  const samples = useSyncExternalStore(subscribe, wantsSamples, () => false);
  const list = samples && sampleList.length ? sampleList : published;
  const [i, setI] = useState(0);
  const drag = useRef<number | null>(null);
  if (list.length === 0) return null;
  const idx = Math.min(i, list.length - 1);
  const t = list[idx];
  const project = t.projectSlug ? projectBySlug(t.projectSlug) : undefined;
  const form = project?.technologies.map((s) => techBySlug(s)).find((x) => !!x)?.slug ?? "mark";
  const go = (d: number) => setI((n) => (Math.min(n, list.length - 1) + d + list.length) % list.length);

  return (
    <section id="testimonials" className="scene home-sec" aria-labelledby="tm-h">
      <div className="container">
        <div className="scene-head">
          <span className="node" aria-hidden="true" /><span className="branch" aria-hidden="true" />
          <p className="eyebrow">Testimonials</p>
          <h2 id="tm-h" style={{ marginTop: 12 }}>The experience, in their words.</h2>
        </div>
        <div
          className="tm"
          role="group"
          aria-roledescription="carousel"
          aria-label="Testimonials"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); go(1); } else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } }}
          onPointerDown={(e) => { drag.current = e.clientX; }}
          onPointerUp={(e) => { if (drag.current !== null && Math.abs(e.clientX - drag.current) > 50) go(e.clientX < drag.current ? 1 : -1); drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
        >
          <div className="tm-frame" key={t.id}>
            <Edge variant="perimeter" duration={6} />
            <div className="tm-media" aria-hidden="true">
              <span className="tm-stage" />
              <TechForm slug={form} size={220} className="tm-art" />
              {project && <span className="tm-proj">{project.title}</span>}
            </div>
            <figure className="tm-quote">
              {t.sample && <span className="tm-sample">Sample · fictional · not a real client</span>}
              <blockquote>{t.quote}</blockquote>
              <figcaption><b>{t.name}</b><span>{t.role}, {t.organisation}</span></figcaption>
              {project && <Link href={project.caseStudy ? `/work/${project.slug}` : `/work#${project.slug}`} className="accent">View project →</Link>}
            </figure>
          </div>
          <div className="tm-ctrl">
            <button type="button" className="btn" onClick={() => go(-1)} aria-label="Previous testimonial">←</button>
            <span className="tm-count" aria-live="polite">{idx + 1} / {list.length}</span>
            <button type="button" className="btn" onClick={() => go(1)} aria-label="Next testimonial">→</button>
          </div>
        </div>
      </div>
    </section>
  );
}
