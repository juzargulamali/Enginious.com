# Supabase (Enginious only)

Dedicated project; never shares credentials, auth, or storage with HR Engine.
Migrations live in `migrations/`. Apply with the Supabase CLI:
`supabase link --project-ref <ref>` then `supabase db push`.
Policy rule: RLS on every public table; public visitors get no direct writes
(enquiries will go through a server route with validation + rate limiting).
