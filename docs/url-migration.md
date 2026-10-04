# Old-to-new URL migration (enginious.ae): INCOMPLETE

**Status: incomplete.** `https://www.enginious.ae` could not be opened from the build environment (the network policy blocks it), so no old URLs were inventoried. Nothing here has been guessed.

## Export needed from you (any one of these)
1. **Best:** the old site's URL list. If it is WordPress/Wix/Squarespace etc.: export the sitemap (`/sitemap.xml` and any `sitemap_index.xml`) and save it as a file. Or from Google Search Console: *Pages -> Export*.
2. **Also useful:** the 50 to 100 most-visited pages from analytics (Search Console *Performance -> Pages*) and any pages with external links.
3. A crawl export, if you have one (Screaming Frog "Internal -> HTML" as CSV).

## What I will do with it
Fill `docs/url-migration/enginious-ae-url-map.csv` (columns: `old_url`, `old_title`, `new_path`, `status`, `notes`), then load every row as a redirect in **/admin -> Redirects**. Rules: map each old page to the closest new page (not everything to the homepage); use 301 for moved pages; old pages with no equivalent get the closest section (for example an old product page to `/technologies`); redirects to other hosts need the host listed under *Allowed redirect hosts* in Site settings. Redirects cannot point at `/admin`, `/api` or form loops (the database refuses them).

## New paths that exist today
`/` `/work` `/work/<slug>` `/technologies` `/technologies/<slug>` `/solutions` `/company` `/company/team` `/uae` `/saudi-arabia` `/europe` `/insights` `/insights/<slug>` `/careers` `/careers/<slug>` `/contact` `/privacy`.

## Before the domain is connected
Load the redirects, then test a sample of old URLs on a preview. Keep MX/SPF/DKIM email records unchanged when the domain is pointed.
