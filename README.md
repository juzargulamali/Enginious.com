# Enginious website

Next.js (App Router) + TypeScript + Tailwind, Supabase (auth, content, media, enquiries), deployed on Vercel.

```bash
cp .env.example .env.local   # fill with Enginious-specific values only
npm install && npm run dev
```

- `/setup-check` shows environment/connection status (token-gated in production).
- Non-production deployments send `noindex` headers and `Disallow: /` in robots.txt.

## Deployment

Hosted on Vercel (project `enginious-com`). Only `VERCEL_ENV=production` is indexable;
every other deployment is `noindex`. Supabase env vars are added per-environment in Vercel settings.
