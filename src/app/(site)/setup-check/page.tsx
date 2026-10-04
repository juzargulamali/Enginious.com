import type { Metadata } from "next";
import { supabaseAnon } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Setup check", robots: { index: false, follow: false } };

const REQUIRED = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

async function supabaseStatus() {
  const sb = supabaseAnon();
  if (!sb) return "not configured";
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      cache: "no-store",
    });
    return res.ok ? "reachable" : `error ${res.status}`;
  } catch {
    return "unreachable";
  }
}

export default async function SetupCheck({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const isProd = process.env.VERCEL_ENV === "production";
  const allowed = !isProd || (!!process.env.SETUP_CHECK_TOKEN && token === process.env.SETUP_CHECK_TOKEN);
  if (!allowed) return <main className="p-8 font-mono">Not available.</main>;

  const rows: [string, string][] = [
    ["Environment", process.env.VERCEL_ENV ?? "local"],
    ["Node", process.version],
    ...REQUIRED.map((k): [string, string] => [k, process.env[k] ? "set" : "missing"]),
    ["Supabase", await supabaseStatus()],
  ];

  return (
    <main className="mx-auto max-w-xl p-8 font-mono text-sm">
      <h1 className="mb-6 text-lg">Enginious - setup check</h1>
      <table className="w-full">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-white/10">
              <td className="py-2 pr-4 opacity-70">{k}</td>
              <td className="py-2">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
