-- Baseline: secure-by-default posture. Content tables arrive with the full brief.
-- Rule: every table in `public` must enable RLS; no anonymous INSERT/UPDATE/DELETE policies.

-- Stop new objects in public from being granted to API roles implicitly.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- Admin allow-list for CMS editors (membership managed by service role / dashboard only).
create table if not exists public.cms_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.cms_admins enable row level security;
-- Intentionally no policies: anon/authenticated cannot read or write; service role bypasses RLS.

create or replace function public.is_cms_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.cms_admins where user_id = auth.uid());
$$;
revoke all on function public.is_cms_admin() from public, anon;
grant execute on function public.is_cms_admin() to authenticated;
