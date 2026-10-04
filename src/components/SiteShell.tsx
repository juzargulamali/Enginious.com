import { BriefProvider } from "@/components/BriefProvider";
import { ContentProvider } from "@/components/ContentProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getContent } from "@/lib/content/load";
import { toClientContent } from "@/lib/content/lean";

/** Header, footer, shortlist and the content context shared by every public page, including the 404. */
export async function SiteShell({ children }: { children: React.ReactNode }) {
  const content = await getContent();
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <ContentProvider value={toClientContent(content)}>
        <BriefProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter content={content} />
        </BriefProvider>
      </ContentProvider>
    </>
  );
}
