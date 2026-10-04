# Environment variables (names only; never commit values)

Set these in **Vercel -> Project `enginious-com` -> Settings -> Environment Variables**. For local work copy `.env.example` to `.env.local`.
"Scope" says where the value must exist. Anything starting `NEXT_PUBLIC_` is visible in the browser: never put a secret in one.

| Name | Required | Scope | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | all | Enginious Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | all | Public anon key. Safe in the browser: RLS limits it to published content. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (enquiries, invites, attachments) | all, **server only** | Bypasses RLS. Used only after a role check, and for storing enquiries. Never expose. |
| `NEXT_PUBLIC_SITE_URL` | yes for launch | Production | The real public origin, `https://...` and **not** `*.vercel.app`. Used for canonical URLs, sitemap and structured data. |
| `ALLOW_INDEXING` | launch only | **Production only** | `true` allows indexing, but only when the deployment is production AND `NEXT_PUBLIC_SITE_URL` is a real https domain. Previews are noindex regardless. Leave unset until launch. |
| `RATE_LIMIT_SALT` | optional | all | Salt for hashing rate-limit keys. If unset, a salt is derived from the service key. |
| `NOTIFY_PROVIDER` | optional | Production/Preview | `resend` to email staff about new enquiries. Unset = no emails (enquiries are still stored). |
| `RESEND_API_KEY` | with `resend` | server only | Provider key. |
| `NOTIFY_FROM` | with `resend` | server only | Verified sender address. |
| `NOTIFY_FALLBACK_TO` | optional | server only | Comma-separated recipients used when a region has none set in the CMS. |
| `NOTIFY_OVERRIDE_TO` | testing | **Preview only** | Sends EVERY notification to this one authorised test address, with `[TEST]` in the subject. Never set in Production. |
| `NEXT_PUBLIC_ANALYTICS_SRC` | optional | all | https script URL of an analytics provider. Loaded only after consent. Unset = no analytics and no consent banner. See `docs/analytics.md`. |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | optional | all | Optional `data-domain` value for that script. |
| `SETUP_CHECK_TOKEN` | existing | server only | Gates `/setup-check`. Rotate or remove at launch. |

Test-only hooks (never set on Vercel): `NOTIFY_OUTBOX_FILE`, `RESEND_API_URL`, `REDIRECT_MAP_TTL_MS`.

## Scopes and the safe initial state

Vercel has three scopes: **Production**, **Preview** (every non-production deployment, including `claude/*` branches) and **Development** (`vercel dev` only).

| Variable | Production | Preview | Development | Safe initial state |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | set | set | set | set |
| `SUPABASE_SERVICE_ROLE_KEY` | set, Sensitive | set, Sensitive | not set | set |
| `NEXT_PUBLIC_SITE_URL` | unset until launch | **never** | not set | unset (previews build links from their own host) |
| `ALLOW_INDEXING` | unset until launch | **never** | not set | unset |
| `NOTIFY_*`, `RESEND_API_KEY` | unset | unset | not set | unset (enquiries stored, notification `skipped`) |
| `NEXT_PUBLIC_ANALYTICS_*` | unset | unset | not set | unset |
| `NOTIFY_OVERRIDE_TO` | **never** | only when testing email to one authorised address | not set | unset |

Because Preview and Production share one Supabase project for now, a preview writes to the same database as production. Hosted test records are labelled `ZZ-TEST-...` and removed again (`docs/hosted-verification.md`).

## Auth URLs the app uses (for Supabase -> Authentication -> URL Configuration -> Redirect URLs)

- `/admin/auth/callback` (invitations) and `/admin/auth/confirm` (password recovery), on every host that should be able to sign people in.
- Preview branch alias, expected form: `https://enginious-git-claude-milestone-2-cms-enginious.vercel.app` (Vercel: `<project>-git-<branch>-<team>.vercel.app`). Confirm the exact host under Vercel -> project -> Deployments -> the branch deployment -> Domains. Each deployment also has its own host, for example `https://enginious-ov43s1uyh-enginious.vercel.app`.
- Wildcard that covers all previews: `https://enginious-*-enginious.vercel.app/admin/**`.
