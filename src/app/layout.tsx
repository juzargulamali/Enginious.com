import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { BriefProvider } from "@/components/BriefProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const body = Geist({ variable: "--font-body", subsets: ["latin"] });
const code = Geist_Mono({ variable: "--font-code", subsets: ["latin"] });
const display = Sora({ variable: "--font-display", subsets: ["latin"], weight: ["400", "600", "700"] });

// Indexing is opt-in (ALLOW_INDEXING=true on the real production site only).
const indexable = process.env.ALLOW_INDEXING === "true";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://enginious-com.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Enginious | Experiential technology, engineered", template: "%s | Enginious" },
  description:
    "Enginious combines creative thinking, engineering, software, hardware and content to deliver experiential technology for events, exhibitions, experience centres and permanent installations. Headquartered in Dubai.",
  robots: indexable ? undefined : { index: false, follow: false },
  openGraph: { siteName: "Enginious", type: "website" },
};

export const viewport: Viewport = { themeColor: "#02070b", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${code.variable} ${display.variable}`}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <BriefProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </BriefProvider>
      </body>
    </html>
  );
}
