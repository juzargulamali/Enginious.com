import Link from "next/link";
import { Logo } from "./Logo";
import { GENERAL_CONTACT, REGIONS } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="stack" style={{ ["--stack" as string]: "0.9rem" }}>
          <Logo />
          <p style={{ maxWidth: "34ch" }}>Driven by innovation. Experiential technology, engineered in Dubai and delivered worldwide.</p>
          <p>
            <a href={`mailto:${GENERAL_CONTACT.email}`}>{GENERAL_CONTACT.email}</a>
            <br />
            <a href={`tel:${GENERAL_CONTACT.phone.replace(/\s/g, "")}`}>{GENERAL_CONTACT.phone}</a>
          </p>
        </div>
        <div>
          <h4>Explore</h4>
          <Link href="/work">Work</Link>
          <Link href="/technologies">Technologies</Link>
          <Link href="/solutions">Solutions</Link>
          <Link href="/insights">Insights</Link>
        </div>
        <div>
          <h4>Company</h4>
          <Link href="/company">Our story</Link>
          <Link href="/company/team">Team &amp; leadership</Link>
          <Link href="/careers">Careers</Link>
          <Link href="/contact">Start a project</Link>
        </div>
        <div>
          <h4>Regions</h4>
          {Object.values(REGIONS).map((r) => (
            <Link key={r.key} href={r.href}>
              {r.name} · {r.role}
            </Link>
          ))}
          <Link href="/privacy">Privacy notice</Link>
        </div>
      </div>
      <div className="container" style={{ marginTop: 32 }}>
        <p>© {new Date().getFullYear()} Enginious. All rights reserved.</p>
      </div>
    </footer>
  );
}
