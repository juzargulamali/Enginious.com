import type { Metadata } from "next";
import Link from "next/link";
import { Placeholder } from "@/components/Placeholder";
import { ReviewNote } from "@/components/ReviewNote";
import { PROJECTS } from "@/content/projects";
import { REGIONS } from "@/content/site";

export const metadata: Metadata = {
  title: "Europe",
  description:
    "Enginious in Europe: our Poland branch connects European projects with Enginious's global creative and engineering capabilities for events, exhibitions, experience centres and permanent installations.",
  alternates: { canonical: "/europe" },
};

const PLAN = [
  {
    t: "Events & exhibitions",
    b: "Experiential technology for stands, activations and roadshows: kinetic displays, interactive installations, immersive rooms and AI activations.",
    techs: ["Experience design", "Interactive applications", "Digital content", "Technology integration"],
    href: "/solutions",
  },
  {
    t: "Experience centres",
    b: "Immersive, interactive spaces that explain a brand, product or place: from first concept to installation and support.",
    techs: ["Immersive rooms", "Interactive tables", "Touch & Throw"],
    href: "/technologies",
  },
  {
    t: "Permanent installations",
    b: "Experiential spaces tailored to your needs, from centres to studios and offices, with maintenance and operation contracts.",
    techs: ["Kinetic displays", "Content", "Maintenance & support"],
    href: "/solutions",
  },
];

const RELEVANT = ["global-health-exhibition", "dubai-air-show", "gitex"].map((s) => PROJECTS.find((p) => p.slug === s)!);

export default function EuropePage() {
  const poland = REGIONS.europe;
  return (
    <>
      <section className="container" style={{ paddingBlock: "clamp(32px, 6vw, 80px)" }}>
        <p className="eyebrow">Poland · European branch</p>
        <h1 style={{ marginTop: 12, maxWidth: "14ch" }}>
          Engineered for experiences. Connected to <span className="accent">Europe.</span>
        </h1>
        <p className="lede" style={{ marginTop: "1.25rem" }}>
          Our Poland branch connects European projects with Enginious&apos;s global creative and engineering capabilities.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
          <Link href="/solutions" className="btn btn-primary">Explore capabilities →</Link>
          <Link href="/contact?region=europe" className="btn">Discuss a European project</Link>
        </div>
        <div className="three" style={{ marginTop: 40 }}>
          <Placeholder title="European project imagery" note="Real imagery to be supplied" style={{ minHeight: 220 }} />
          <Placeholder title="Branch / team imagery" note="Poland branch photography to be supplied" style={{ minHeight: 220 }} />
          <Placeholder title="Delivery imagery" note="Installation photography to be supplied" style={{ minHeight: 220 }} />
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <p className="eyebrow">Services · What are you planning?</p>
        <h2 style={{ marginTop: 12 }}>What are you planning?</h2>
        <p className="lede" style={{ marginTop: 14 }}>From initial concept to final implementation, we help bring your ideas to life with immersive technology and creative engineering.</p>
        <div className="three" style={{ marginTop: 32 }}>
          {PLAN.map((p) => (
            <Link key={p.t} href={p.href} className="panel plan-card">
              <h3>{p.t}</h3>
              <p className="muted" style={{ marginTop: 10 }}>{p.b}</p>
              <ul style={{ display: "flex", flexWrap: "wrap", gap: 6, listStyle: "none", padding: 0, marginTop: 16 }}>
                {p.techs.map((t) => <li key={t} className="chip" style={{ minHeight: 28, padding: "0 .65rem", fontSize: ".76rem", cursor: "inherit" }}>{t}</li>)}
              </ul>
              <span className="accent" style={{ marginTop: "auto", paddingTop: 16 }}>Explore →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <p className="eyebrow">Our work</p>
        <h2 style={{ marginTop: 12 }}>Explore our work.</h2>
        <p className="muted" style={{ margin: "14px 0 24px", maxWidth: "62ch" }}>
          We don&apos;t list projects delivered in Europe on this page yet. These are examples of the large-format work
          our team delivers at major international exhibitions.
        </p>
        <ul className="tech-grid" style={{ ["--min" as string]: "300px" }}>
          {RELEVANT.map((p) => (
            <li key={p.slug} className="panel tech-item">
              <p className="eyebrow">{p.location} · {p.year}</p>
              <h3 style={{ marginTop: 6 }}>{p.title}</h3>
              <p className="muted" style={{ marginTop: 8, fontSize: "0.92rem" }}>{p.summary}</p>
              <Link href={`/work#${p.slug}`} className="accent" style={{ marginTop: "auto", paddingTop: 14 }}>View in Work →</Link>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 20 }}>
          <ReviewNote>
            Confirm: any Europe-delivered projects (the profile map shows several European countries but names no
            project), the Poland branch city and address, staff, stock, and which services are performed locally versus
            supported from Dubai. None of these are stated here.
          </ReviewNote>
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <p className="eyebrow">Global collaboration</p>
        <h2 style={{ marginTop: 12 }}>One connected team.</h2>
        <p className="muted" style={{ margin: "14px 0 0" }}>Discuss your project scope, location and delivery needs with our team.</p>
        <div className="route" style={{ marginTop: 32 }}>
          {Object.values(REGIONS).map((r, i, a) => (
            <div key={r.key} style={{ display: "contents" }}>
              <Link href={r.href} className="node">
                <span className="dot" aria-hidden="true" />
                <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", marginTop: 10 }}>{r.name}</strong>
                <span className="muted">{r.role}</span>
              </Link>
              {i < a.length - 1 && <span className="link" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <div className="panel enter">
          <h2>Let&apos;s build your next experience in <span className="accent">Europe.</span></h2>
          <p className="lede" style={{ margin: "14px 0 24px" }}>Project scope and delivery arrangements are confirmed with our team.</p>
          <Link href="/contact?region=europe" className="btn btn-primary">Start a project →</Link>
          <p className="muted" style={{ marginTop: 16, fontSize: "0.85rem" }}>
            {poland.email ? poland.email : "Contact details for the Poland branch will be added here."}
          </p>
        </div>
      </section>
    </>
  );
}
