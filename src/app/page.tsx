import type { Metadata } from "next";
import Link from "next/link";
import "./home.css";
import { KineticHero } from "@/components/KineticHero";
import { TechForm } from "@/components/TechForm";
import { WorldMap } from "@/components/WorldMap";
import { PROJECTS, projectBySlug } from "@/content/projects";
import { GENERAL_CONTACT, REGIONS } from "@/content/site";
import { techBySlug } from "@/content/technologies";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const PROVIDE = [
  { t: "Events, exhibitions & activations", b: "Experiential technology and content for stands, roadshows and brand moments.", f: "kinetic-wall-ceiling", href: "/solutions" },
  { t: "Experience centres & permanent installations", b: "Immersive spaces tailored to your needs, from centres to studios and offices.", f: "immersive-room", href: "/solutions" },
  { t: "Interactive software & content", b: "Unity and Unreal applications and 2D/3D content built for the screens in the room.", f: "touch-and-throw", href: "/solutions" },
  { t: "Engineering & integration", b: "Mechatronics, product design and hardware/software integration, from concept to production.", f: "robotic-arm", href: "/technologies" },
  { t: "Operation & maintenance", b: "After-sales support and dedicated maintenance contracts for installed technology.", f: "circular-dial", href: "/solutions" },
];

const REEL = ["global-health-exhibition", "dubai-air-show", "cityscape", "whx", "leap", "fifa-arab-cup"].map((s) => projectBySlug(s)!);
const REEL_FORM: Record<string, string> = { "global-health-exhibition": "tri-helix", "dubai-air-show": "immersive-room", cityscape: "robotic-arm", whx: "dna-xs", leap: "holofan", "fifa-arab-cup": "ar-vr" };

const org = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Enginious",
  slogan: "Driven by innovation",
  logo: "/brand/enginious-mark.svg",
  email: GENERAL_CONTACT.email,
  telephone: GENERAL_CONTACT.phone,
  address: { "@type": "PostalAddress", addressLocality: "Dubai", addressCountry: "AE" },
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <KineticHero />

      {/* ---- what we provide ---- */}
      <section className="container section home-sec" aria-labelledby="prov-h">
        <div className="prov">
          <div className="prov-lead">
            <p className="eyebrow">What we provide</p>
            <h2 id="prov-h" style={{ marginTop: 12 }}>One team for the whole experience.</h2>
            <p className="lede">
              Enginious combines creative thinking, engineering, software, hardware and content, so what is imagined is
              also built, installed and kept running.
            </p>
            <Link href="/solutions" className="btn" style={{ marginTop: 24 }}>All solutions →</Link>
          </div>
          <ul className="prov-list">
            {PROVIDE.map((p) => (
              <li key={p.t}>
                <Link href={p.href} className="prov-row">
                  <TechForm slug={p.f} size={76} className="ico" />
                  <div>
                    <h3>{p.t}</h3>
                    <p>{p.b}</p>
                  </div>
                  <span className="accent" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- idea -> engineering -> experience, with real evidence ---- */}
      <section className="container section home-sec" aria-labelledby="story-h" style={{ paddingTop: 0 }}>
        <p className="eyebrow">How it comes together</p>
        <h2 id="story-h" className="sec-head" style={{ marginTop: 12 }}>From idea to a delivered experience.</h2>
        <div className="chap-row">
          <article className="chap">
            <span className="num">01 · IDEA</span>
            <TechForm slug="mark" className="form" size={170} />
            <h3>Strategy and creative development</h3>
            <p>We start with the story and the audience: what visitors should see, do and discover.</p>
            <Link href="/work#chronicles-ahmed-al-maghribi" className="proof">
              <b>The Chronicles of Ahmed Al Maghribi</b>
              Dubai · 2025 · conception, planning and delivery
            </Link>
          </article>
          <article className="chap">
            <span className="num">02 · ENGINEERING</span>
            <TechForm slug="tri-helix" className="form" size={170} />
            <h3>Mechatronics, software, integration</h3>
            <p>Moving structures, interactive software and content are designed and built to work as one system.</p>
            <Link href="/technologies/tri-helix" className="proof">
              <b>Tri-Helix</b>
              Rotating triangular screens that stack and turn 360°
            </Link>
          </article>
          <article className="chap">
            <span className="num">03 · EXPERIENCE</span>
            <TechForm slug="immersive-room" className="form" size={170} />
            <h3>Delivered, operated, supported</h3>
            <p>Installed on show floors and in permanent spaces, then run and maintained for the length of the event.</p>
            <Link href="/work#global-health-exhibition" className="proof">
              <b>Global Health Exhibition</b>
              Riyadh · 2025 · 16 activations across 9 booths
            </Link>
          </article>
        </div>
      </section>

      {/* ---- project evidence ---- */}
      <section className="home-sec section" aria-labelledby="ev-h" style={{ paddingTop: 0 }}>
        <div className="container">
          <p className="eyebrow">Evidence</p>
          <h2 id="ev-h" className="sec-head" style={{ marginTop: 12 }}>Seen on the show floor.</h2>
          <div className="stats">
            <div className="stat">
              <b>16</b>
              <span>technology-led activations across nine booths in a single exhibition.</span>
              <small>Global Health Exhibition · Riyadh · 2025</small>
            </div>
            <div className="stat">
              <b>5</b>
              <span>countries activated in one roadshow: UAE, Qatar, Oman, Bahrain and Saudi Arabia.</span>
              <small>FIFA Arab Cup Roadshow · 2025</small>
            </div>
          </div>
        </div>
        <div className="reel" tabIndex={0} aria-label="Selected projects. Scroll sideways.">
          {REEL.map((p) => {
            const names = p.technologies.slice(0, 3).map((s) => techBySlug(s)?.name).filter(Boolean);
            return (
              <Link key={p.slug} href={p.caseStudy ? `/work/${p.slug}` : `/work#${p.slug}`} className="pc">
                <TechForm slug={REEL_FORM[p.slug] ?? "mark"} size={260} className="art" />
                <span className="meta">{p.location} · {p.year}</span>
                <h3>{p.title}</h3>
                {p.client && <span className="client">{p.client}</span>}
                <span className="tags">{names.map((n) => <span key={n}>{n}</span>)}</span>
              </Link>
            );
          })}
        </div>
        <div className="container" style={{ marginTop: 8 }}>
          <Link href="/work" className="btn">All {PROJECTS.length} projects →</Link>
        </div>
      </section>

      {/* ---- global presence ---- */}
      <section className="container section home-sec" aria-labelledby="glob-h" style={{ paddingTop: 0 }}>
        <p className="eyebrow">Global presence</p>
        <h2 id="glob-h" className="sec-head" style={{ marginTop: 12 }}>Dubai headquarters. Two branches.</h2>
        <div className="glob">
          <WorldMap />
          <div>
            <ul className="regions-list">
              {Object.values(REGIONS).map((r) => (
                <li key={r.key}>
                  <Link href={r.href}>
                    <strong>{r.name}</strong>
                    <span>{r.role}</span>
                    <span className="go" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="also">
              Projects have also been delivered in Qatar, Oman, Bahrain, Jeddah, Madinah and Belém, Brazil. Offices are shown solid; project locations hollow.
            </p>
          </div>
        </div>
      </section>

      {/* ---- routes ---- */}
      <section className="container section home-sec" aria-labelledby="go-h" style={{ paddingTop: 0 }}>
        <p className="eyebrow">Where next</p>
        <h2 id="go-h" className="sec-head" style={{ marginTop: 12 }}>Step further in.</h2>
        <div className="doors">
          <Link href="/work" className="door d-work">
            <span className="dart"><span className="stack-art"><i>Global Health Exhibition</i><i>Dubai Airshow</i><i>Cityscape Riyadh</i></span></span>
            <h3>Work</h3>
            <p>Delivered projects across the UAE, Saudi Arabia and beyond.</p>
            <span className="go" aria-hidden="true">→</span>
          </Link>
          <Link href="/technologies" className="door">
            <span className="dart"><span className="tower-mini"><i /><i /><i /><i /></span></span>
            <h3>Technologies</h3>
            <p>Kinetic, interactive, immersive, AI and robotics.</p>
            <span className="go" aria-hidden="true">→</span>
          </Link>
          <Link href="/company/team" className="door">
            <span className="dart"><span className="frames"><i /><i /><i /></span></span>
            <h3>People</h3>
            <p>The engineers and creators behind it.</p>
            <span className="go" aria-hidden="true">→</span>
          </Link>
          <Link href="/contact" className="door d-start">
            <h3>Start a project</h3>
            <p>Tell us your idea. We&apos;ll connect you with the right team.</p>
            <span className="go" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="final home-sec">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="mark" src="/brand/enginious-mark.svg" alt="" aria-hidden="true" />
        <div className="container">
          <h2>
            Let&apos;s build something worth <span className="accent">experiencing.</span>
          </h2>
          <p className="lede">Dubai · Saudi Arabia · Poland serving Europe</p>
          <Link href="/contact" className="btn btn-primary">Start a project →</Link>
        </div>
      </section>
    </>
  );
}
