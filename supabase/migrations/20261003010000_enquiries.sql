-- Project enquiries. Written ONLY by the server (service role) after validation.
-- No anonymous or authenticated INSERT policy exists, so the public API key cannot write here.

create table if not exists public.enquiries (
  id            uuid primary key default gen_random_uuid(),
  reference     text not null unique,
  submission_id uuid not null unique,   -- client-generated; makes retries/double-submits idempotent
  created_at    timestamptz not null default now(),
  status        text not null default 'new' check (status in ('new', 'in_progress', 'closed', 'spam')),
  region        text not null check (region in ('uae', 'ksa', 'europe')),
  name          text not null check (char_length(name) between 1 and 120),
  email         text not null check (char_length(email) between 3 and 254),
  company       text check (char_length(company) <= 160),
  country       text check (char_length(country) <= 80),
  project_type  text check (project_type in ('event', 'permanent', 'other')),
  event_date    date,
  budget        text check (budget in ('under-50k', '50-150k', '150-500k', 'over-500k', 'unsure')),
  message       text not null check (char_length(message) between 10 and 5000),
  technologies  text[] not null default '{}' check (cardinality(technologies) <= 12),
  source_path   text,
  notified_at   timestamptz            -- set when a notification provider delivers (not configured yet)
);

create index if not exists enquiries_created_at_idx on public.enquiries (created_at desc);

alter table public.enquiries enable row level security;

revoke all on public.enquiries from anon, authenticated;

-- Editors (cms_admins) may read enquiries and change their status. Nothing else.
grant select on public.enquiries to authenticated;
grant update (status) on public.enquiries to authenticated;

create policy "cms admins read enquiries" on public.enquiries
  for select to authenticated using (public.is_cms_admin());

create policy "cms admins update enquiry status" on public.enquiries
  for update to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());
