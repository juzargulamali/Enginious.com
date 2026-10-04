import Link from "next/link";
import { Logo } from "./Logo";
import type { SiteContent } from "@/lib/content/types";

export function SiteFooter({ content }: { content: SiteContent }) {
  const { settings, regions } = content;
  const social = Object.entries(settings.social).filter(([, v]) => !!v) as [string, string][];
  const SOCIAL_LABEL: Record<string, string> = { linkedin: "LinkedIn", instagram: "Instagram", x: "X", youtube: "YouTube" };
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="stack" style={{ ["--stack" as string]: "0.9rem" }}>
          <Logo />
          <p style={{ maxWidth: "34ch" }}>{settings.footerText ?? "Driven by innovation. Experiential technology, engineered in Dubai and delivered worldwide."}</p>
          <p>
            <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
            <br />
            <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}>{settings.contactPhone}</a>
          </p>
          {social.length > 0 && (
            <p style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {social.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noopener noreferrer">{SOCIAL_LABEL[k] ?? k}</a>)}
            </p>
          )}
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
          {settings.companyProfileUrl && <a href={settings.companyProfileUrl} target="_blank" rel="noopener">Company profile (PDF)</a>}
        </div>
        <div>
          <h4>Regions</h4>
          {Object.values(regions).map((r) => (
            <Link key={r.key} href={r.href}>
              {r.name} · {r.role}
            </Link>
          ))}
          <Link href="/privacy">Privacy notice</Link>
        </div>
      </div>
      <div className="container" style={{ marginTop: 32 }}>
        <p>© {new Date().getFullYear()} {settings.companyName}. All rights reserved.</p>
      </div>
    </footer>
  );
}
