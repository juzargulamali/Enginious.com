# Enginious website

Next.js (App Router) + TypeScript + Tailwind, Supabase (auth, content, media, enquiries), deployed on Vercel.

```bash
cp .env.example .env.local   # fill with Enginious-specific values only
npm install && npm run dev
```

- `/setup-check` shows environment/connection status (token-gated in production).
- Non-production deployments send `noindex` headers and `Disallow: /` in robots.txt.
