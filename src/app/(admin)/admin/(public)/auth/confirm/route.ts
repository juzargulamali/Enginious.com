import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseUser } from "@/lib/supabase/server";

// Landing route for invite and recovery emails when the Supabase email templates use {{ .TokenHash }}
// (see docs/cms-setup.md). Verifies the one-time token, starts the session, then sends the person to choose a password.
export const dynamic = "force-dynamic";
const TYPES: EmailOtpType[] = ["invite", "recovery", "email", "magiclink", "signup", "email_change"];

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const code = p.get("code"); // PKCE flow (default for resetPasswordForEmail from the server client)
  const tokenHash = p.get("token_hash");
  const type = p.get("type") as EmailOtpType | null;
  const nextRaw = p.get("next") ?? "/admin/set-password";
  const next = nextRaw.startsWith("/admin") && !nextRaw.startsWith("//") ? nextRaw : "/admin/set-password";
  const fail = new URL("/admin/set-password", request.url); // shows the "link expired" state
  const sb = await supabaseUser();
  if (!sb) return NextResponse.redirect(fail);
  if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(error ? fail : new URL(next, request.url));
  }
  if (!tokenHash || !type || !TYPES.includes(type)) return NextResponse.redirect(fail);
  const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
  return NextResponse.redirect(error ? fail : new URL(next, request.url));
}
