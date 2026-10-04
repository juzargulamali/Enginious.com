"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV, REGION_NAV } from "@/content/site";
import { BriefMenu } from "./BriefMenu";
import { Logo } from "./Logo";

export function SiteHeader() {
  const pathname = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  // The menu is open only for the page it was opened on, so navigating closes it.
  const open = openFor === pathname;
  const btn = useRef<HTMLButtonElement>(null);
  const home = pathname === "/";
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    let raf = 0;
    const on = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; setSolid(window.scrollY > 48); }); };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); cancelAnimationFrame(raf); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpenFor(null); btn.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Exact match for Company (so Team does not light both), prefix match for the rest.
  const active = (href: string) => (href === "/company" ? pathname === "/company" : pathname === href || pathname.startsWith(href + "/"));

  return (
    <header className="site-header" data-home={home || undefined} data-solid={solid || undefined}>
      <div className="container bar">
        <Logo />
        <nav className="nav-links" aria-label="Primary">
          {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>{n.label}</Link>)}
        </nav>
        <nav className="nav-regions" aria-label="Regions">
          {REGION_NAV.map((n) => <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>{n.label}</Link>)}
        </nav>
        <div className="nav-cta">
          <BriefMenu />
          <Link href="/contact" className="btn btn-primary nav-start">Start a project →</Link>
          <button ref={btn} type="button" className="btn menu-btn" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpenFor(open ? null : pathname)}>{open ? "Close" : "Menu"}</button>
        </div>
      </div>
      {open && (
        <nav id="mobile-menu" className="mobile-menu" aria-label="Mobile">
          {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>{n.label}</Link>)}
          <p className="eyebrow" style={{ margin: "1.2rem 0 0" }}>Regions</p>
          {REGION_NAV.map((n) => <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}>{n.label}</Link>)}
          <Link href="/contact" className="accent">Start a project →</Link>
        </nav>
      )}
    </header>
  );
}
