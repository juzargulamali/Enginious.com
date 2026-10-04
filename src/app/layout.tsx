import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { indexingAllowed, metadataOrigin } from "@/lib/seo/indexing";

const body = Geist({ variable: "--font-body", subsets: ["latin"] });
const code = Geist_Mono({ variable: "--font-code", subsets: ["latin"] });
const display = Sora({ variable: "--font-display", subsets: ["latin"], weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(metadataOrigin()),
  title: { default: "Enginious | Experiential technology, engineered", template: "%s | Enginious" },
  description:
    "Enginious combines creative thinking, engineering, software, hardware and content to deliver experiential technology for events, exhibitions, experience centres and permanent installations. Headquartered in Dubai.",
  // Indexing is opt-in and never possible on previews (see lib/seo/indexing.ts).
  robots: indexingAllowed() ? undefined : { index: false, follow: false },
  openGraph: { siteName: "Enginious", type: "website" },
};

export const viewport: Viewport = { themeColor: "#02070b", colorScheme: "dark" };

// The site chrome (header, footer, shortlist) lives in the (site) group layout; /admin has its own shell.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${code.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
