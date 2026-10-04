"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem { href: string; label: string; badge?: number; hot?: boolean }
export interface NavGroup { heading: string; items: NavItem[] }

export function AdminNav({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));
  return (
    <nav className="adm-nav" aria-label="CMS">
      {groups.map((g) => (
        <div key={g.heading}>
          <p className="adm-navh">{g.heading}</p>
          {g.items.map((i) => (
            <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}>
              <span>{i.label}</span>
              {typeof i.badge === "number" && i.badge > 0 && <span className={`n${i.hot ? " hot" : ""}`}>{i.badge}</span>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
