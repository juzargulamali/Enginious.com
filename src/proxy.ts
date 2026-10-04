import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { findRedirect } from "@/lib/redirect-map";

/**
 * Proxy (Next 16 "middleware"):
 *  1. /admin and /api/admin: refresh the Supabase session cookie and, as an optimistic first gate, send signed-out visitors to
 *     the login page. This is NOT the security boundary: every page, Server Action and Route Handler re-checks the role, and the
 *     database enforces RLS. Admin responses are never cached and always carry noindex.
 *  2. Everything else: apply CMS-managed redirects (slug changes, migrated URLs).
 */
const PUBLIC_ADMIN = [/^\/admin\/login\/?$/, /^\/admin\/forgot-password\/?$/, /^\/admin\/auth\//, /^\/admin\/set-password\/?$/];

async function adminGate(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await supabase.auth.getUser();
    const open = PUBLIC_ADMIN.some((re) => re.test(pathname));
    if (!data.user && !open) {
      if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthenticated" }, { status: 401, headers: { "Cache-Control": "no-store" } });
      const login = new URL("/admin/login", request.url);
      if (pathname !== "/admin") login.searchParams.set("next", pathname + request.nextUrl.search);
      return NextResponse.redirect(login);
    }
  }
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/")) return adminGate(request);

  if (request.method === "GET" || request.method === "HEAD") {
    const rule = await findRedirect(pathname);
    if (rule) {
      const dest = rule.target.startsWith("/") ? new URL(rule.target, request.url) : new URL(rule.target);
      if (rule.target.startsWith("/") && !dest.search && request.nextUrl.search) dest.search = request.nextUrl.search;
      return NextResponse.redirect(dest, rule.status as 301 | 302 | 307 | 308);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|webp|avif|gif|svg|ico|pdf|mp4|webm|woff2?|txt|xml|json|js|css|map)$).*)"],
};
