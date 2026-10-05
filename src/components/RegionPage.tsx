import Link from "next/link";
import "./regions.css";
import "@/components/neon/neon.css";
import { Markdown } from "./Markdown";
import { Photo } from "./Photo";
import { JsonLd } from "./JsonLd";
import { Edge } from "./neon/Edge";
import { NeonController } from "./neon/NeonController";
import { SceneHead } from "./neon/SceneHead";
import { Spine } from "./neon/Spine";
import { RegionProjects } from "./RegionProjects";
import { VideoPlayer } from "./video/VideoPlayer";
import { breadcrumbLd } from "@/lib/seo/jsonld";
import { SLOTS } from "@/content/images";
import { PLACES_DATA } from "@/content/places";
import type { RegionKey } from "@/content/site";
import type { Project } from "@/content/projects";
import type { SiteContent } from "@/lib/content/types";

/**
 * One template, three regional stories. Everything shown is driven by the CMS "Regions and offices" record, the existing Solutions and Projects, and
 * facts DERIVED from the published data (project cities, counts). Built-in defaults below only restate what the company profile and the owner have
 * confirmed. Sections with nothing to show are not rendered (no empty or placeholder panels). Offices are Dubai, Riyadh and Poznań; other places are
 * project locations, never offices. What is not confirmed (Poznań address, staff, which services are local) is simply not claimed.
 */
type Defaults = { eyebrow: string; h1: React.ReactNode; lede: string; storyTitle: string; story: (d: Derived) => string; slot: string; serviceBadge?: string };
type Derived = { cities: string[]; count: number };

const PATH: Record<RegionKey, string> = { uae: "/uae", ksa: "/saudi-arabia", europe: "/europe" };
const REGION_OF: Record<RegionKey, Project["region"] | null> = { uae: "uae", ksa: "ksa", europe: null };
const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

const DEFAULTS: Record<RegionKey, Defaults> = {
  uae: {
    eyebrow: "UAE · Global headquarters",
    h1: <>Dubai, <span className="accent">global headquarters.</span></>,
    lede: "Our global headquarters is in Dubai, where creative, engineering, software and delivery teams work as one.",
    storyTitle: "Where the whole team works as one.",
    story: (d) => `Dubai is home to our global headquarters, where strategy, creative, engineering, software and delivery sit together. ${d.cities.length ? `Projects recorded in the UAE are in ${list(d.cities)}.` : ""}`.trim(),
    slot: "regionUae",
    serviceBadge: "Delivered from Dubai headquarters",
  },
  ksa: {
    eyebrow: "Saudi Arabia · Branch",
    h1: <>Our branch in <span className="accent">the Kingdom.</span></>,
    lede: "Our Saudi Arabia branch is based in Riyadh, working with Dubai on projects across the Kingdom.",
    storyTitle: "Riyadh, working with Dubai.",
    story: (d) => `Our Saudi Arabia branch is based in Riyadh and works with the Dubai headquarters on projects across the Kingdom. ${d.cities.length ? `Projects recorded in Saudi Arabia are in ${list(d.cities)}.` : ""}`.trim(),
    slot: "regionKsa",
  },
  europe: {
    eyebrow: "Poland · Branch serving Europe",
    h1: <>Engineered for experiences. Connected to <span className="accent">Europe.</span></>,
    lede: "Our Poland branch connects European projects with Enginious's global creative and engineering capabilities.",
    storyTitle: "Poznań, connected to the world.",
    story: () => "Our branch in Poznań, Poland serves European clients and connects European projects with the creative and engineering capabilities of the whole Enginious team.",
    slot: "regionEurope",
  },
};

const DISPLAY: Record<RegionKey, string> = { uae: "Dubai", ksa: "Riyadh", europe: "Poznań, Poland" };
const cityOf = (location: string) => location.split(",")[0].replace(/^WTC$/, "Dubai").trim();

export function RegionPage({ regionKey, content }: { regionKey: RegionKey; content: SiteContent }) {
  const r = content.regions[regionKey];
  const d = DEFAULTS[regionKey];
  const email = r.email ?? content.settings.contactEmail;
  const phone = r.phone ?? content.settings.contactPhone;
  const wanted = REGION_OF[regionKey];

  // ---- facts derived from the published projects
  const regionProjects = wanted ? content.projects.filter((p) => p.region === wanted) : [];
  const cities = [...new Set(regionProjects.map((p) => cityOf(p.location)).filter((c) => c && !/multi-location|^UAE$/i.test(c)))];
  const derived: Derived = { cities, count: regionProjects.length };
  const featured = r.projects.map((s) => content.projects.find((p) => p.slug === s)).filter((p): p is Project => !!p);
  const projects = featured.length ? featured : regionProjects.slice(0, 6);

  // ---- hero media: CMS photograph, else the built-in city photograph; a hero video replaces it and uses it as poster
  const heroId = (r.heroImage && content.images[r.heroImage] ? r.heroImage : undefined) ?? content.images[content.slots[d.slot] ?? (SLOTS as Record<string, string>)[d.slot]]?.id;
  const posterId = r.video?.poster && content.images[r.video.poster] ? r.video.poster : heroId;

  // ---- services: existing Solutions, with local / Dubai-supported labels only where the CMS says so
  const bySlug = (slugs: string[]) => slugs.map((s) => content.solutions.find((x) => x.slug === s)).filter((x): x is NonNullable<typeof x> => !!x);
  const local = bySlug(r.servicesLocal), viaDubai = bySlug(r.servicesDubai);
  const labelled = local.length + viaDubai.length > 0;
  const services = labelled
    ? [...local.map((s) => ({ s, badge: regionKey === "uae" ? "Delivered from Dubai headquarters" : `Delivered from ${r.cardTitle ?? r.name}`, kind: "local" })), ...viaDubai.filter((s) => !local.includes(s)).map((s) => ({ s, badge: "Supported by the Dubai team", kind: "dubai" }))]
    : content.solutions.map((s) => ({ s, badge: d.serviceBadge ?? "", kind: d.serviceBadge ? "local" : "" }));

  const steps = r.process.length ? r.process : content.company.process?.steps ?? [];
  const europeLocations = regionKey === "europe" ? PLACES_DATA.filter((p) => p.project && p.group === "europe") : [];

  const facts: { label: string; value: React.ReactNode }[] = r.facts.length ? r.facts : [
    { label: "Role", value: r.role },
    ...(r.city ? [{ label: "City", value: r.city }] : []),
    ...(wanted ? [{ label: "Projects recorded here", value: String(derived.count) }] : europeLocations.length ? [{ label: "European project locations", value: String(europeLocations.length) }] : []),
    { label: "Contact", value: <a href={`mailto:${email}`}>{email}</a> },
  ];

  const name = r.cardTitle ?? DISPLAY[regionKey];
  const ctaTitle = r.ctaTitle ?? (regionKey === "uae" ? "Start a project with the Dubai team." : regionKey === "ksa" ? "Start a project in the Kingdom." : "Start a project in Europe.");
  const story = r.story ?? d.story(derived);
  const storyTitle = r.storyTitle ?? d.storyTitle;

  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: r.name, path: PATH[regionKey] }])} />
      <NeonController />
      <section className="rg-hero">
        <div className="container rg-hero-in">
          <div className="rg-copy">
            <p className="eyebrow">{r.eyebrow ?? d.eyebrow}</p>
            <h1>{r.headline ?? d.h1}</h1>
            {r.intro ? <div className="lede"><Markdown source={r.intro} /></div> : <p className="lede">{d.lede}</p>}
            <div className="rg-cta">
              <Link href={`/contact?region=${regionKey}`} className="btn btn-primary">Start a project with {name} →</Link>
              <Link href="/work" className="btn">See our work</Link>
            </div>
          </div>
          {(heroId || r.video) && (
            <div className="rg-media" data-media={heroId && !r.video ? "pending" : undefined}>
              {r.video ? <VideoPlayer video={r.video} title={`${name} introduction`} posterImageId={posterId} /> : (
                <>
                  <Photo id={heroId} className="rg-photo" sizes="(max-width: 900px) 100vw, 640px" priority />
                  <Edge variant="perimeter" duration={11} />
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="rg-glance container" aria-label={`${name} at a glance`}>
        <ul>{facts.map((f) => <li key={f.label}><span>{f.label}</span><b>{f.value}</b></li>)}</ul>
      </div>

      <div className="scenes" style={{ position: "relative" }}>
        <Spine />

        <section className="scene" aria-labelledby="rg-story-h">
          <div className="container">
            <SceneHead eyebrow={regionKey === "europe" ? "Poznań branch" : regionKey === "ksa" ? "Riyadh branch" : "Dubai headquarters"} title={storyTitle} id="rg-story-h">
              <div className="rg-story">{story.split(/\n\s*\n/).filter(Boolean).map((t) => <p key={t}>{t}</p>)}</div>
            </SceneHead>
            {(cities.length > 0 || europeLocations.length > 0) && (
              <div className="rg-where">
                <p className="eyebrow">{regionKey === "europe" ? "Project locations in Europe" : "Where we have delivered here"}</p>
                <ul className="rg-chips">
                  {regionKey === "europe"
                    ? europeLocations.map((p) => <li key={p.id}><span className="chip" style={{ cursor: "default" }}>{p.name}, {p.country}</span></li>)
                    : cities.map((c) => <li key={c}><span className="chip" style={{ cursor: "default" }}>{c} · {regionProjects.filter((p) => cityOf(p.location) === c).length}</span></li>)}
                </ul>
                {regionKey === "europe" && <p className="muted">These are places where our team has delivered projects (supplied by the company). Individual European projects are not listed yet. <Link href="/#global" className="accent">See the map →</Link></p>}
              </div>
            )}
          </div>
        </section>

        {services.length > 0 && (
          <section className="scene" aria-labelledby="rg-serv-h">
            <div className="container">
              <SceneHead eyebrow="What we do" title={regionKey === "uae" ? "Everything an experience needs, from Dubai." : `Capabilities available through ${name}.`} id="rg-serv-h">
                {!labelled && regionKey !== "uae" && <p className="lede" style={{ marginTop: "1.1rem" }}>Delivery is coordinated with our Dubai headquarters, so you reach the whole Enginious team.</p>}
              </SceneHead>
              <ul className="rg-serv">
                {services.map(({ s, badge, kind }) => (
                  <li key={s.slug} className="panel" data-kind={kind || undefined}>
                    {badge && <span className="rg-badge">{badge}</span>}
                    <h3><Link href={`/solutions#${s.slug}`}>{s.title}</Link></h3>
                    <p className="muted">{s.summary}</p>
                  </li>
                ))}
              </ul>
              {r.capabilities.length > 0 && <ul className="rg-chips" style={{ marginTop: 18 }}>{r.capabilities.map((c) => <li key={c}><span className="chip" style={{ cursor: "default" }}>{c}</span></li>)}</ul>}
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section className="scene" aria-labelledby="rg-proj-h">
            <div className="container">
              <SceneHead eyebrow={featured.length ? "Featured work" : "Work in this region"} title={regionKey === "ksa" ? "Delivered in the Kingdom." : regionKey === "uae" ? "Delivered across the UAE." : "Delivered with the Europe team."} id="rg-proj-h" />
              <RegionProjects projects={projects} all={wanted ? `/work` : "/work"} />
            </div>
          </section>
        )}

        {steps.length > 0 && (
          <section className="scene" aria-labelledby="rg-proc-h">
            <div className="container">
              <SceneHead eyebrow="How a project runs" title={regionKey === "uae" ? "From first idea to the last day on site." : `The same delivery process, through ${name}.`} id="rg-proc-h" />
              <ol className="rg-steps" data-neon>
                {steps.map((st, i) => <li key={st.title}><i aria-hidden="true">{String(i + 1).padStart(2, "0")}</i><b>{st.title}</b>{st.body && <span>{st.body}</span>}</li>)}
              </ol>
            </div>
          </section>
        )}

        <section className="scene" aria-labelledby="rg-contact-h">
          <div className="container">
            <SceneHead eyebrow="Contact" title={ctaTitle} id="rg-contact-h">
              {r.ctaText && <p className="lede" style={{ marginTop: "1.1rem" }}>{r.ctaText}</p>}
            </SceneHead>
            <div className="rg-contact">
              <dl className="panel">
                <Edge variant="top" duration={12} />
                <div><dt>{name}{r.city ? ` · ${r.city}` : ""}</dt></div>
                <div><dt className="muted">Email</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div>
                <div><dt className="muted">Phone</dt><dd><a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a></dd></div>
                {r.address && <div><dt className="muted">Address</dt><dd style={{ whiteSpace: "pre-line" }}>{r.address}</dd></div>}
                {r.email === null && <p className="muted" style={{ fontSize: "0.86rem" }}>Enquiries for this office reach our general team, who connect you with the right people.</p>}
              </dl>
              <div className="rg-actions">
                <Link href={`/contact?region=${regionKey}`} className="btn btn-primary btn-lg">Start a project with {name} →</Link>
                <Link href="/contact" className="btn">Not sure which office? Contact us</Link>
                <p className="muted">Offices are in Dubai (headquarters), Riyadh and Poznań. Other places on our map are project locations, not offices. <Link href="/#global" className="accent">See the map →</Link></p>
              </div>
            </div>
          </div>
        </section>

        <section className="scene" aria-labelledby="rg-team-h">
          <div className="container">
            <SceneHead eyebrow="Global collaboration" title="One connected team." id="rg-team-h" />
            <div className="route" style={{ marginTop: 32 }}>
              {Object.values(content.regions).map((x, i, a) => (
                <div key={x.key} style={{ display: "contents" }}>
                  <Link href={x.href} className="node" aria-current={x.key === regionKey ? "page" : undefined}>
                    <span className="dot" aria-hidden="true" />
                    <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", marginTop: 10 }}>{x.cardTitle ?? x.name}</strong>
                    <span className="muted">{x.role}</span>
                  </Link>
                  {i < a.length - 1 && <span className="link" aria-hidden="true" />}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
