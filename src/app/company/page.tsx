import type { Metadata } from "next";
import Link from "next/link";
import "./company.css";
import "@/components/neon/neon.css";
import { Photo } from "@/components/Photo";
import { Edge } from "@/components/neon/Edge";
import { NeonController } from "@/components/neon/NeonController";
import { SceneHead } from "@/components/neon/SceneHead";
import { Spine } from "@/components/neon/Spine";
import { TechForm } from "@/components/TechForm";
import { IMAGES } from "@/content/images";
import { LEADERS } from "@/content/leaders";
import { REGIONS } from "@/content/site";
import { PEOPLE } from "@/content/team";

export const metadata: Metadata = {
  title: "Company",
  description: "How Enginious works: creative strategy, content, software, hardware, engineering, installation and support in one team, headquartered in Dubai with branches in Saudi Arabia and Poland.",
  alternates: { canonical: "/company" },
};

// DRAFT wording for approval (see docs/content-todo.md). Based on the company profile's mission and vision.
const MISSION = "To help organisations captivate their audiences with experiential technology that is engineered, built and supported by one team.";
const VISION = "To lead the way in innovative, immersive experiences: pioneering customisable technology for events, automation and robotics around the world.";

// Seven connected stages. Short on purpose: the visual carries the sequence.
const LIFE: [string, string, string][] = [
  ["Strategy", "The idea and the audience.", "touch-and-throw"],
  ["Creative & content", "2D and 3D storytelling.", "holofan"],
  ["Software", "Interactive applications.", "ar-vr"],
  ["Hardware & engineering", "Mechatronics and product design.", "robotic-arm"],
  ["Integration & testing", "Joined and tested as one system.", "tri-helix"],
  ["Installation", "On the show floor, on schedule.", "kinetic-wall-ceiling"],
  ["Support", "Operation and maintenance.", "circular-dial"],
];

const CAPS = [
  ["touch-and-throw", "Experience strategy & creative development", "Concepts, storyboards and the idea behind the experience."],
  ["kinetic-wall-ceiling", "Events, exhibitions & brand activations", "Technology and content for stands, roadshows and brand moments."],
  ["immersive-room", "Experience centres & permanent installations", "Immersive spaces from centres to studios and offices."],
  ["ar-vr", "Interactive software & applications", "Unity and Unreal applications, AR and VR experiences."],
  ["holofan", "Digital content creation", "2D and 3D content for every display."],
  ["robotic-arm", "Engineering & bespoke technology", "Mechatronics, product design and custom development."],
  ["tri-helix", "Hardware / software integration", "Kinetic, interactive and immersive systems working as one."],
  ["circular-dial", "Installation, operation & support", "On-site delivery, maintenance contracts and after-sales support."],
];

const LEADS = PEOPLE.filter((p) => p.dept === "leadership");

export default function CompanyPage() {
  return (
    <>
      <NeonController />
      <section className="co-hero">
        <div className="container">
          <p className="eyebrow">Company</p>
          <h1>One team, from first idea to <span className="accent">last day on site.</span></h1>
          <p className="lede" style={{ marginTop: "1.4rem" }}>
            Enginious brings creative thinking, engineering, software, hardware and content together to deliver experiential technology for events, exhibitions, brand activations, experience centres and permanent installations.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
            <Link href="/contact" className="btn btn-primary">Start a project →</Link>
            <Link href="/company/team" className="btn">Meet the team</Link>
          </div>
        </div>
      </section>

      <div className="scenes" style={{ position: "relative" }}>
        <Spine />

        <section className="scene" aria-labelledby="story-h">
          <div className="container">
            <SceneHead eyebrow="Our story" title="Where innovators meet artisans." id="story-h" />
            <div className="co-two" style={{ marginTop: 36 }}>
              <div className="co-story">
                <p>Enginious is a tribe of engineers, creative artists and designers who push the boundaries of technology to captivate audiences, elevate brands and deliver transformative experiences.</p>
                <p>We work with brands, agencies, corporate marketing teams, government organisations and teams developing permanent experience spaces, from kinetic displays and interactive installations to immersive environments, AI activations, AR and VR, and bespoke applications.</p>
                <p>Our global headquarters is in Dubai, with a branch in Saudi Arabia and a branch in Poland serving Europe.</p>
              </div>
              <div className="co-mv" style={{ marginTop: 0 }}>
                <article className="co-card"><Edge variant="top" duration={11} /><p className="eyebrow">Mission</p><p>{MISSION}</p></article>
                <article className="co-card"><Edge variant="bottom-right" duration={11} /><p className="eyebrow">Vision</p><p>{VISION}</p></article>
              </div>
            </div>
          </div>
        </section>

        <section className="scene" aria-labelledby="how-h">
          <div className="container">
            <SceneHead eyebrow="How Enginious works" title="Creative, content, software, hardware and delivery: connected." id="how-h">
              <p className="lede" style={{ marginTop: "1.1rem" }}>One team, one sequence: developed together, tested together, then installed and supported by the people who made it.</p>
            </SceneHead>
            <ol className="co-life" style={{ listStyle: "none", padding: 0 }} data-neon>
              <span className="co-run" aria-hidden="true"><em /></span>
              {LIFE.map(([t, b, f], i) => (
                <li key={t} className="co-step">
                  <span className="ico"><TechForm slug={f} size={64} /></span>
                  <span className="n">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{t}</h3>
                  <p>{b}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="scene" aria-labelledby="cap-h2">
          <div className="container">
            <SceneHead eyebrow="Capabilities" title="What you can commission." id="cap-h2" />
            <ul className="co-cap">
              {CAPS.map(([f, t, b]) => (<li key={t}><TechForm slug={f} size={64} /><span><b>{t}</b>{b}</span></li>))}
            </ul>
            <div style={{ marginTop: 28 }}><Link href="/technologies" className="btn">Explore technologies →</Link></div>
          </div>
        </section>

        <section className="scene" aria-labelledby="lead-h">
          <div className="container">
            <SceneHead eyebrow="Leadership" title="Two perspectives. One direction." id="lead-h" />
            <div className="co-lead">
              {LEADS.map((p) => {
                const photo = LEADERS[p.id]?.photo;
                return (
                  <Link key={p.id} href="/company/team">
                    <Edge variant="left" duration={12} />
                    <span className="av">{photo && IMAGES[photo] ? <Photo id={photo} sizes="110px" label={false} /> : p.name.split(" ").map((w) => w[0]).join("")}</span>
                    <span><b>{p.name}</b><span>{p.role}</span></span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="scene" aria-labelledby="ops-h">
          <div className="container">
            <SceneHead eyebrow="Global operations" title="Dubai headquarters. Two branches." id="ops-h" />
            <div className="co-regions">
              {Object.values(REGIONS).map((r) => (
                <Link key={r.key} href={r.href}><Edge variant={r.key === "uae" ? "perimeter" : r.key === "ksa" ? "top" : "left"} duration={13} /><b>{r.name}</b><span>{r.key === "uae" ? "Global Headquarters" : r.key === "ksa" ? "Saudi Arabia Branch" : "Branch serving Europe"}</span><em>Explore →</em></Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
