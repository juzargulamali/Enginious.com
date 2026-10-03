import Link from "next/link";
import { CanvasBoundary } from "@/components/CanvasBoundary";
import { LivingCanvas } from "@/components/LivingCanvas";
import { Placeholder } from "@/components/Placeholder";
import { ReviewNote } from "@/components/ReviewNote";
import { PROJECTS } from "@/content/projects";
import { REGIONS, SERVICES } from "@/content/site";

const FEATURED = ["global-health-exhibition", "cityscape", "dubai-air-show", "f1-etihad", "whx"].map(
  (s) => PROJECTS.find((p) => p.slug === s)!,
);

export default function Home() {
  return (
    <>
      <section className="container" style={{ paddingBlock: "clamp(32px, 6vw, 80px) clamp(40px, 6vw, 90px)" }}>
        <div className="hero-grid">
          <div className="stack" style={{ ["--stack" as string]: "1.5rem" }}>
            <p className="eyebrow">Dubai · Saudi Arabia · Europe</p>
            <h1>
              Experiences,
              <br />
              <span className="accent">engineered.</span>
            </h1>
            <p className="lede">
              Enginious combines creative thinking, engineering, software, hardware and content to deliver
              experiential technology for events, exhibitions, brand activations, experience centres and permanent
              installations.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link href="/work" className="btn btn-primary">
                Explore our work →
              </Link>
              <Link href="/contact" className="btn">
                Start a project
              </Link>
            </div>
            <ul className="muted" style={{ listStyle: "none", padding: 0, display: "grid", gap: 4, fontSize: "0.92rem" }}>
              <li>Kinetic displays · Interactive installations · Immersive environments</li>
              <li>AI activations · AR/VR · Robotics · Bespoke applications</li>
            </ul>
          </div>
          <CanvasBoundary>
            <LivingCanvas />
          </CanvasBoundary>
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <p className="eyebrow">What you can commission</p>
        <h2 style={{ marginTop: 12, maxWidth: "18ch" }}>From first idea to the show floor.</h2>
        <ol className="rows">
          {SERVICES.map((s, i) => (
            <li key={s.title}>
              <Link href={s.href} className="row">
                <span className="num">{String(i + 1).padStart(2, "0")}</span>
                <span className="t">{s.title}</span>
                <span className="b muted">{s.body}</span>
                <span className="arrow accent" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">Selected work</p>
            <h2 style={{ marginTop: 12 }}>Seen on the show floor.</h2>
          </div>
          <Link href="/work" className="btn">
            All projects →
          </Link>
        </div>
        <div className="strip" tabIndex={0} aria-label="Selected projects, scrollable">
          {FEATURED.map((p) => (
            <Link key={p.slug} href={p.caseStudy ? `/work/${p.slug}` : "/work"} className="strip-card panel">
              <Placeholder title="Project media" note="Approved photography / video to be supplied" style={{ minHeight: 190 }} />
              <p className="eyebrow" style={{ marginTop: 14 }}>
                {p.location} · {p.year}
              </p>
              <h3 style={{ marginTop: 6 }}>{p.title}</h3>
              <p className="muted" style={{ marginTop: 8, fontSize: "0.92rem" }}>{p.summary}</p>
            </Link>
          ))}
        </div>
        <div className="container" style={{ marginTop: 16 }}>
          <ReviewNote>
            Featured selection is provisional. Photography/video and client approvals are needed; see docs/content-todo.md.
          </ReviewNote>
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <div className="panel enter">
          <div className="stack" style={{ ["--stack" as string]: "1rem" }}>
            <p className="eyebrow">Technologies</p>
            <h2>Walk into the showroom.</h2>
            <p className="lede">
              Kinetic, interactive, immersive, AI and robotics: explore the technologies behind our installations, then
              add the ones you like to your project brief.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/technologies" className="btn btn-primary">
                Enter the showroom →
              </Link>
              <Link href="/technologies#browse" className="btn">
                View all technologies
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <p className="eyebrow">Global presence</p>
        <h2 style={{ marginTop: 12, maxWidth: "20ch" }}>One connected team.</h2>
        <div className="route" style={{ marginTop: 36 }}>
          {Object.values(REGIONS).map((r, i, a) => (
            <div key={r.key} style={{ display: "contents" }}>
              <Link href={r.href} className="node">
                <span className="dot" aria-hidden="true" />
                <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", marginTop: 10 }}>{r.name}</strong>
                <span className="muted">{r.role}</span>
              </Link>
              {i < a.length - 1 && <span className="link" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <div className="people-cta">
          <div className="stack" style={{ ["--stack" as string]: "1rem" }}>
            <p className="eyebrow">People</p>
            <h2>Meet the minds behind the experience.</h2>
            <p className="lede">Engineers, creators and problem-solvers: one team across engineering, software, content and delivery.</p>
            <Link href="/company/team" className="btn btn-primary" style={{ width: "fit-content" }}>
              Meet the team →
            </Link>
          </div>
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0, textAlign: "center" }}>
        <h2 style={{ maxWidth: "20ch", marginInline: "auto" }}>
          Let&apos;s build something worth <span className="accent">experiencing.</span>
        </h2>
        <p className="lede" style={{ margin: "1rem auto 1.75rem" }}>
          Tell us your idea. We&apos;ll connect you with the right team.
        </p>
        <Link href="/contact" className="btn btn-primary">
          Start a project →
        </Link>
      </section>
    </>
  );
}
