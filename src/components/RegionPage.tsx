import Link from "next/link";
import { Markdown } from "./Markdown";
import { Placeholder } from "./Placeholder";
import { JsonLd } from "./JsonLd";
import { breadcrumbLd } from "@/lib/seo/jsonld";
import type { RegionKey } from "@/content/site";
import type { SiteContent } from "@/lib/content/types";

const HEAD: Record<RegionKey, { eyebrow: string; h1: React.ReactNode; lede: string }> = {
  uae: { eyebrow: "UAE · Global headquarters", h1: <>Dubai, <span className="accent">global headquarters.</span></>, lede: "Our global headquarters is in Dubai, where creative, engineering, software and delivery teams work as one." },
  ksa: { eyebrow: "Saudi Arabia · Branch", h1: <>Our branch in <span className="accent">the Kingdom.</span></>, lede: "Our Saudi Arabia branch is based in Riyadh, working with Dubai on projects across the Kingdom." },
  europe: { eyebrow: "Poland · Branch serving Europe", h1: <>Engineered for experiences. Connected to <span className="accent">Europe.</span></>, lede: "Our Poland branch connects European projects with Enginious's global creative and engineering capabilities." },
};
const PATH: Record<RegionKey, string> = { uae: "/uae", ksa: "/saudi-arabia", europe: "/europe" };
const DEFAULT_CAPS = ["Events, exhibitions and activations", "Experience centres", "Permanent installations", "Interactive software and content", "Engineering and integration", "Operation and maintenance"];

/**
 * One template for the three regional pages, driven by the CMS "Regions" items. It states plainly that Dubai, Riyadh and
 * Poland are OFFICES and that other places are project-delivery locations (see the map on the home page). It never claims an
 * office in a project city and shows related work only where the CMS links it (or, for UAE/KSA, projects recorded in that region).
 */
export function RegionPage({ regionKey, content }: { regionKey: RegionKey; content: SiteContent }) {
  const r = content.regions[regionKey];
  const head = HEAD[regionKey];
  const email = r.email ?? content.settings.contactEmail;
  const phone = r.phone ?? content.settings.contactPhone;
  const caps = r.capabilities.length ? r.capabilities : DEFAULT_CAPS;
  const linked = r.projects.map((s) => content.projects.find((p) => p.slug === s)).filter((p): p is NonNullable<typeof p> => !!p);
  const related = linked.length ? linked : regionKey === "europe" ? [] : content.projects.filter((p) => p.region === (regionKey === "ksa" ? "ksa" : "uae")).slice(0, 6);
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: "Home", path: "/" }, { name: r.name, path: PATH[regionKey] }])} />
      <section className="container" style={{ paddingBlock: "clamp(32px, 6vw, 80px)" }}>
        <p className="eyebrow">{head.eyebrow}</p>
        <h1 style={{ marginTop: 12, maxWidth: "16ch" }}>{head.h1}</h1>
        {r.intro ? <div className="lede" style={{ marginTop: "1.25rem", maxWidth: "62ch" }}><Markdown source={r.intro} /></div> : <p className="lede" style={{ marginTop: "1.25rem" }}>{head.lede}</p>}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
          <Link href={`/contact?region=${regionKey}`} className="btn btn-primary">Start a project with {r.name} →</Link>
          <Link href="/solutions" className="btn">Explore capabilities</Link>
        </div>
        <div className="three" style={{ marginTop: 40 }}>
          <Placeholder title={`${r.name} imagery`} style={{ minHeight: 200 }} />
          <Placeholder title="Team imagery" style={{ minHeight: 200 }} />
          <Placeholder title="Delivery imagery" style={{ minHeight: 200 }} />
        </div>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <p className="eyebrow">Contact</p>
        <h2 style={{ marginTop: 12 }}>{r.name}{r.city ? ` · ${r.city}` : ""}</h2>
        <dl className="panel" style={{ margin: "20px 0 0", padding: 22, display: "grid", gap: 10, maxWidth: 560 }}>
          <div><dt className="muted">Email</dt><dd style={{ margin: 0 }}><a href={`mailto:${email}`}>{email}</a></dd></div>
          <div><dt className="muted">Phone</dt><dd style={{ margin: 0 }}><a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a></dd></div>
          {r.address && <div><dt className="muted">Address</dt><dd style={{ margin: 0, whiteSpace: "pre-line" }}>{r.address}</dd></div>}
        </dl>
        {r.email === null && <p className="muted" style={{ marginTop: 12, fontSize: "0.88rem" }}>Enquiries for this region reach our general team, who connect you with the right people.</p>}
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <p className="eyebrow">What we do</p>
        <h2 style={{ marginTop: 12 }}>Capabilities from this office.</h2>
        <ul className="tech-grid" style={{ ["--min" as string]: "260px", marginTop: 24 }}>
          {caps.map((c) => <li key={c} className="panel tech-item"><h3 style={{ fontSize: "1.05rem" }}>{c}</h3></li>)}
        </ul>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <p className="eyebrow">Our work</p>
        <h2 style={{ marginTop: 12 }}>{related.length ? "Related work." : "Work in this region."}</h2>
        {related.length === 0 ? (
          <p className="muted" style={{ margin: "14px 0 0", maxWidth: "62ch" }}>We do not list projects delivered in Europe on this page yet. Browse all of our work to see the large-format projects our team delivers at international exhibitions.</p>
        ) : (
          <ul className="tech-grid" style={{ ["--min" as string]: "300px", marginTop: 24 }}>
            {related.map((p) => (
              <li key={p.slug} className="panel tech-item">
                <p className="eyebrow">{p.location} · {p.year}</p>
                <h3 style={{ marginTop: 6 }}>{p.title}</h3>
                <p className="muted" style={{ marginTop: 8, fontSize: "0.92rem" }}>{p.summary}</p>
                <Link href={p.caseStudy ? `/work/${p.slug}` : `/work#${p.slug}`} className="accent" style={{ marginTop: "auto", paddingTop: 14 }}>View in Work →</Link>
              </li>
            ))}
          </ul>
        )}
        <p className="muted" style={{ marginTop: 18, maxWidth: "62ch", fontSize: "0.9rem" }}>
          Offices and project locations are different things. Our offices are in Dubai (headquarters), Riyadh and Poland. Other places on our map are where we have delivered projects, not offices. <Link href="/#global" className="accent">See the map →</Link>
        </p>
      </section>

      <section className="container section" style={{ paddingTop: 0 }}>
        <p className="eyebrow">Global collaboration</p>
        <h2 style={{ marginTop: 12 }}>One connected team.</h2>
        <div className="route" style={{ marginTop: 32 }}>
          {Object.values(content.regions).map((x, i, a) => (
            <div key={x.key} style={{ display: "contents" }}>
              <Link href={x.href} className="node" aria-current={x.key === regionKey ? "page" : undefined}>
                <span className="dot" aria-hidden="true" />
                <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", marginTop: 10 }}>{x.name}</strong>
                <span className="muted">{x.role}</span>
              </Link>
              {i < a.length - 1 && <span className="link" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
