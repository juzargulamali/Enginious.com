import type { Metadata } from "next";
import Link from "next/link";
import { Placeholder } from "@/components/Placeholder";
import { ReviewNote } from "@/components/ReviewNote";
import { PortraitPlaceholder, TeamGallery, TeamList } from "@/components/TeamGallery";
import { PEOPLE } from "@/content/team";
import { REGIONS } from "@/content/site";

export const metadata: Metadata = {
  title: "Team & leadership",
  description: "Meet the engineers, creators and problem-solvers behind Enginious, and the leadership guiding the company.",
  alternates: { canonical: "/company/team" },
};

export default function TeamPage() {
  const leaders = PEOPLE.filter((p) => p.dept === "leadership");
  return (
    <>
      <section className="container" style={{ paddingBlock: "clamp(32px, 5vw, 64px) 0" }}>
        <p className="eyebrow">People · Inside the Enginious world</p>
        <h1 style={{ marginTop: 12, textAlign: "center", marginInline: "auto", maxWidth: "16ch" }}>
          Meet the <span className="accent">minds</span> behind the experience.
        </h1>
        <p className="lede" style={{ textAlign: "center", margin: "1.25rem auto 0" }}>
          Engineers. Creators. Problem-solvers. One connected team.
        </p>
        <TeamGallery />
        <div style={{ marginTop: 20 }}>
          <ReviewNote>
            Names and roles come from the Company Profile 2026 Q2 and are unconfirmed. No portraits are used; every
            card is a marked placeholder until real photography and consent are supplied.
          </ReviewNote>
        </div>
      </section>

      <section className="container section">
        <p className="eyebrow">Leadership</p>
        <h2 style={{ marginTop: 12 }}>Two perspectives. One direction.</h2>
        <div className="lead-grid" style={{ marginTop: 32 }}>
          {leaders.map((l) => (
            <article key={l.id} className="panel" style={{ padding: "clamp(18px, 3vw, 30px)", display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
              <PortraitPlaceholder name={l.name} big />
              <div className="stack" style={{ ["--stack" as string]: "0.7rem", flex: "1 1 240px" }}>
                <h3>{l.name}</h3>
                <p className="accent">{l.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <p className="eyebrow">Behind the scenes</p>
        <h2 style={{ marginTop: 12 }}>Workshop, development, testing, installation.</h2>
        <div className="three" style={{ marginTop: 28 }}>
          {["Workshop", "Development & testing", "Installation on site"].map((t) => (
            <Placeholder key={t} title={t} note="Real team photography to be supplied" style={{ minHeight: 200 }} />
          ))}
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <p className="eyebrow">Connected across borders</p>
        <h2 style={{ marginTop: 12 }}>Dubai, Saudi Arabia, Poland.</h2>
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
        <h2 style={{ fontSize: "1.6rem" }}>Everyone</h2>
        <p className="muted" style={{ margin: "8px 0 20px" }}>A plain list of the whole team, available without the 3D gallery.</p>
        <TeamList />
        <div style={{ display: "flex", gap: 12, marginTop: 40, flexWrap: "wrap", alignItems: "center" }}>
          <h3>Build what comes next.</h3>
          <Link href="/careers" className="btn btn-primary">Explore careers →</Link>
        </div>
      </section>
    </>
  );
}
