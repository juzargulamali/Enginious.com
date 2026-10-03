# Launch checklist (do NOT do before the site is finished and tested)

- [ ] All content and media complete; full QA on the preview/production URL.
- [ ] Set `ALLOW_INDEXING=true` in Vercel (Production scope only) and redeploy.
      Until then the site sends noindex headers and `Disallow: /` in robots.txt.
- [ ] Add `enginious.ae` (and `www`) in Vercel -> Domains; set the DNS records Vercel shows.
      Test on a subdomain first (e.g. new.enginious.ae). Keep MX/SPF/DKIM email records unchanged.
- [ ] Decide plans: Vercel Pro (Hobby is non-commercial); Supabase Pro (backups, no pausing).
- [ ] Make the GitHub repository private if desired.
- [ ] Add sitemap.xml and hreflang for UAE/KSA/Europe pages; submit to Search Console.
- [ ] Rotate `SETUP_CHECK_TOKEN` or remove /setup-check.
