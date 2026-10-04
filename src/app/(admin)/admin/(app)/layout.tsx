import Link from "next/link";
import { requireStaffPage } from "@/lib/cms/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { TYPE_DEFS, type ContentType } from "@/lib/cms/schema";
import { AdminNav, type NavGroup } from "@/components/admin/AdminNav";
import { signOut } from "../actions/auth";

export const dynamic = "force-dynamic";

const CONTENT_ORDER: ContentType[] = ["project", "technology", "solution", "company_section", "person", "region", "client", "testimonial", "article", "role", "faq"];

export default async function AdminApp({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffPage();
  const sb = await supabaseUser();
  let newEnquiries = 0;
  if (sb) {
    const { count } = await sb.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new");
    newEnquiries = count ?? 0;
  }
  const groups: NavGroup[] = [
    { heading: "Overview", items: [{ href: "/admin", label: "Dashboard" }] },
    { heading: "Inbox", items: [{ href: "/admin/enquiries", label: "Enquiries", badge: newEnquiries, hot: true }] },
    { heading: "Content", items: CONTENT_ORDER.map((t) => ({ href: `/admin/content/${t}`, label: TYPE_DEFS[t].plural })) },
    {
      heading: "Site",
      items: [
        { href: "/admin/content/setting", label: "Site settings" },
        { href: "/admin/content/page_seo", label: "Page search settings" },
        { href: "/admin/redirects", label: "Redirects" },
        { href: "/admin/media", label: "Media library" },
      ],
    },
    ...(staff.role === "administrator" ? [{ heading: "Administration", items: [{ href: "/admin/users", label: "Users and access" }, { href: "/admin/audit", label: "Audit log" }] }] : []),
  ];
  const side = (
    <>
      <p className="adm-brand">Enginious <span>CMS</span></p>
      <AdminNav groups={groups} />
      <div className="adm-user">
        <span>{staff.email}<br />{staff.role === "administrator" ? "Administrator" : "Editor"}</span>
        <Link href="/" className="adm-btn adm-btn-sm adm-btn-ghost" target="_blank" rel="noopener">View public site</Link>
        <form action={signOut}><button type="submit" className="adm-btn adm-btn-sm">Sign out</button></form>
      </div>
    </>
  );
  return (
    <div className="adm-shell">
      <a className="skip" href="#admin-main">Skip to content</a>
      <aside className="adm-side" aria-label="Sidebar">{side}</aside>
      <details className="adm-top">
        <summary><span className="adm-brand">Enginious <span>CMS</span></span><span>Menu</span></summary>
        <div className="adm-side-inner">{side}</div>
      </details>
      <main id="admin-main" className="adm-main">{children}</main>
    </div>
  );
}
