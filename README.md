# Enginious website

Next.js 16 (App Router) + TypeScript, Supabase (auth, content, media, enquiries), deployed on Vercel. A CMS lives at `/admin`.

```bash
cp .env.example .env.local   # fill with Enginious-specific values only
npm install && npm run dev
```

- **CMS:** `/admin` (invite-only). Setup: `docs/cms-setup.md`. Handover for the next session: `docs/HANDOVER.md`.
- `/setup-check` shows environment/connection status (token-gated in production).
- Unless indexing is explicitly enabled for a real production domain, every response is `noindex` and `robots.txt` disallows everything (`src/lib/seo/indexing.ts`). Previews are never indexable.

## Checks

```bash
npm run typecheck && npm run lint && npm test     # unit tests (28)
npm run test:db                                    # database security tests against a local throw-away Postgres (113)
bash scripts/test/e2e.sh admin-e2e public-e2e auth-e2e enquiry-e2e media-e2e admin-visual   # CMS end to end, local stand-ins
bash scripts/test/indexing-check.sh                # indexing / production-mode safeguards (several builds)
bash scripts/test/consent-check.sh                 # analytics loads only after consent
```
The local stand-ins (`scripts/test/*`) emulate Supabase (REST with real row level security, auth, storage) and an email provider. They never touch a real project or send real email. Results: `docs/test-report.md`.

## Deployment

Hosted on Vercel (project `enginious-com`). Environment variables: `docs/environment.md`. Launch steps: `LAUNCH.md`.
