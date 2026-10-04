import { BriefProvider } from "@/components/BriefProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <BriefProvider>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </BriefProvider>
    </>
  );
}
