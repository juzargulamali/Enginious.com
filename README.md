# Enginious website

Next.js (App Router) + TypeScript + Tailwind, Supabase (auth, content, media, enquiries), deployed on Vercel.

```bash
cp .env.example .env.local   # fill with Enginious-specific values only
npm install && npm run dev
```

- `/setup-check` shows environment/connection status (token-gated in production).
- Unless `ALLOW_INDEXING=true`, the site sends `noindex` headers and `Disallow: /` in robots.txt.

## Deployment

Hosted on Vercel (project `enginious-com`). Everything is `noindex` unless `ALLOW_INDEXING=true`
is set (do this only at public launch). Supabase env vars are added per-environment in Vercel settings.
