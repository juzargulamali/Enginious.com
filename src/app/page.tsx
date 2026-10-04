import type { Metadata } from "next";
import Link from "next/link";
import "./home.css";
import "@/components/neon/neon.css";
import { ClientsField } from "@/components/home/ClientsField";
import { EvidenceFilm } from "@/components/home/EvidenceFilm";
import { FilmFacade } from "@/components/home/FilmFacade";
import { FinalCTA } from "@/components/home/FinalCTA";
import { TeamGallery } from "@/components/home/TeamGallery";
import { PortalCard } from "@/components/home/PortalCard";
import { ShowreelHero } from "@/components/home/ShowreelHero";
import { ShowroomTeaser } from "@/components/home/ShowroomTeaser";
import { Testimonials } from "@/components/home/Testimonials";
import { TowerSection } from "@/components/home/TowerSection";
import { Edge } from "@/components/neon/Edge";
import { NeonController } from "@/components/neon/NeonController";
import { SceneHead } from "@/components/neon/SceneHead";
import { Spine } from "@/components/neon/Spine";
import { TechForm } from "@/components/TechForm";
import { PlacesMap } from "@/components/PlacesMap";
import { filmPoster, resolveShowreel, YOUTUBE } from "@/content/media";
import { PROJECTS, projectBySlug } from "@/content/projects";
import { GENERAL_CONTACT } from "@/content/site";
import { techBySlug } from "@/content/technologies";

export const metadata: Metadata = { alternates: { canonical: "/" } };

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
  const showreel = resolveShowreel();
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      {/* connect early so the poster and player start sooner (React hoists these into <head>) */}
      <link rel="preconnect" href="https://i.ytimg.com" />
      <link rel="preconnect" href="https://www.youtube-nocookie.com" />
      <ShowreelHero cfg={showreel} />
      <NeonController />

      <div className="scenes">
        <Spine />

        {/* ---- 1. what we deliver ---- */}
        <section id="capabilities" className="scene home-sec" aria-labelledby="cap-h">
          <div className="container">
            <SceneHead eyebrow="What we deliver" title="Everything an experience needs." id="cap-h">
              <p className="lede" style={{ marginTop: "1.1rem" }}>
                From the first idea to the last day on site: one team for strategy, content, software, hardware and delivery.
              </p>
            </SceneHead>
            <div className="cap-grid" data-trace-scope>
              <PortalCard n="01" title="Events, exhibitions & activations" blurb="Technology and content for stands, roadshows and brand moments, built to draw a crowd and keep it." tags={["Experience design", "Interactive applications", "Digital content"]} form="kinetic-wall-ceiling" href="/solutions" edge="perimeter" slot="capEvents" />
              <PortalCard n="02" title="Experience centres" blurb="Immersive, interactive spaces that explain a brand, product or place." tags={["Immersive rooms", "Interactive tables", "Touch & Throw"]} form="immersive-room" href="/solutions" edge="left" slot="capCentres" />
              <PortalCard n="03" title="Permanent installations" blurb="Experiential spaces tailored to your needs, with maintenance and support that keeps them running." tags={["Kinetic displays", "Content", "Maintenance & support"]} form="tri-helix" href="/solutions" edge="bottom-right" slot="capPermanent" />
            </div>
            <ul className="cap-more">
              <li><TechForm slug="touch-and-throw" size={52} /><span><b>Interactive software &amp; content</b>Unity and Unreal applications, 2D and 3D content.</span></li>
              <li><TechForm slug="robotic-arm" size={52} /><span><b>Engineering &amp; integration</b>Mechatronics, product design and hardware/software integration.</span></li>
              <li><TechForm slug="circular-dial" size={52} /><span><b>Operation &amp; maintenance</b>After-sales support and dedicated maintenance contracts.</span></li>
            </ul>
          </div>
        </section>

        {/* ---- 2. engineering experiences (the tower) ---- */}
        <section id="engineering" className="scene tower-scene home-sec" aria-labelledby="eng-h">
          <div className="container">
            <SceneHead eyebrow="Engineering experiences" title="From idea to installation, in one turn." id="eng-h">
              <p className="lede" style={{ marginTop: "1.1rem" }}>
                Enginious builds kinetic structures of stacked, rotating screens. Turn this one to see how an experience is made, and what we provide at each stage.
              </p>
            </SceneHead>
            <TowerSection />
          </div>
        </section>

        {/* ---- 3. technology showroom ---- */}
        <section id="technology" className="scene home-sec" aria-labelledby="tech-h">
          <div className="container">
            <SceneHead eyebrow="Technologies" title="Step into the showroom." id="tech-h">
              <p className="lede" style={{ marginTop: "1.1rem" }}>
                Kinetic, interactive, immersive, AI and robotics. Pick an exhibit, read what it does, and add it to your project brief.
              </p>
            </SceneHead>
            <ShowroomTeaser />
          </div>
        </section>

        {/* ---- 4. project evidence ---- */}
        <section id="projects" className="scene home-sec" aria-labelledby="proj-h" style={{ paddingInline: 0 }}>
          <div className="container">
            <SceneHead eyebrow="Evidence" title="Seen on the show floor." id="proj-h" />
            <div className="proj-top proj-stats">
              <div className="stats">
                <div className="stat"><b>16</b><span>technology-led activations across nine booths in a single exhibition.</span><small>Global Health Exhibition · Riyadh · 2025</small></div>
                <div className="stat"><b>5</b><span>countries activated in one roadshow: UAE, Qatar, Oman, Bahrain and Saudi Arabia.</span><small>FIFA Arab Cup Roadshow · 2025</small></div>
              </div>
            </div>
          </div>
          <div className="container">
            <EvidenceFilm>
              <div className="film-wrap" data-trace-scope>
                <Edge variant="brackets" duration={12} />
                <FilmFacade youtubeId={YOUTUBE.film} poster={filmPoster()} title="Watch more from Enginious" />
              </div>
            </EvidenceFilm>
          </div>
          <div className="reel" tabIndex={0} aria-label="Selected projects. Scroll sideways.">
            {REEL.map((p, i) => {
              const names = p.technologies.slice(0, 3).map((s) => techBySlug(s)?.name).filter(Boolean);
              return (
                <Link key={p.slug} href={p.caseStudy ? `/work/${p.slug}` : `/work#${p.slug}`} className="pr" data-v={i % 3}>
                  <TechForm slug={REEL_FORM[p.slug] ?? "mark"} size={260} className="art" />
                  <span className="meta">{p.location} · {p.year}</span>
                  <h3>{p.title}</h3>
                  {p.client && <span className="client">{p.client}</span>}
                  <span className="tags">{names.map((n) => <span key={n}>{n}</span>)}</span>
                </Link>
              );
            })}
          </div>
          <div className="container"><Link href="/work" className="btn">All {PROJECTS.length} projects →</Link></div>
        </section>

        {/* ---- 4b. clients ---- */}
        <section id="clients" className="scene home-sec" aria-labelledby="cl-h">
          <div className="container">
            <SceneHead eyebrow="Clients" title="Connected through experience." id="cl-h">
              <p className="lede" style={{ marginTop: "1.1rem" }}>Select a name to see the work we delivered together.</p>
            </SceneHead>
            <ClientsField />
          </div>
        </section>

        {/* ---- 4c. testimonials (published only; fictional samples on previews with ?samples=1) ---- */}
        <Testimonials sampleAllowed={process.env.ALLOW_INDEXING !== "true"} />

        {/* ---- 5. people ---- */}
        <section id="people" className="scene home-sec" aria-labelledby="ppl-h">
          <div className="container">
            <SceneHead eyebrow="People" title="Meet the minds behind the experience." id="ppl-h" />
            <TeamGallery showLink depth />
          </div>
        </section>

        {/* ---- 6. global presence ---- */}
        <section id="global" className="scene home-sec" aria-labelledby="glob-h">
          <div className="container">
            <SceneHead eyebrow="Global presence" title="Dubai headquarters. Two branches." id="glob-h" />
            <p className="lede" style={{ marginTop: "1.1rem" }}>Offices are solid diamonds; delivered-project locations are rings. Select a place to see what is there.</p>
            <PlacesMap />
          </div>
        </section>

        {/* ---- 7. close ---- */}
        <FinalCTA />
      </div>
    </>
  );
}
