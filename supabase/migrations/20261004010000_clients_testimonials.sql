-- Clients, client<->project links and testimonials, all editable in the CMS. Public sees only published rows;
-- only CMS admins write. Logos and media are references into public.media_assets (never inline files).

create table if not exists public.clients (
  id            text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  name          text not null check (char_length(name) between 1 and 160),
  relationship  text not null default 'unconfirmed' check (relationship in ('direct', 'agency', 'unconfirmed')),
  logo_asset_id text references public.media_assets (id) on delete set null,
  website       text check (website ~ '^https?://'),
  sort_order    integer not null default 0,
  published     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.client_projects (
  client_id    text not null references public.clients (id) on delete cascade,
  project_slug text not null check (project_slug ~ '^[a-z0-9-]{1,80}$'),
  primary key (client_id, project_slug)
);

create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  quote         text not null check (char_length(quote) between 10 and 600),
  speaker_name  text not null check (char_length(speaker_name) between 1 and 120),
  speaker_role  text not null check (char_length(speaker_role) between 1 and 160),
  organisation  text not null check (char_length(organisation) between 1 and 160),
  client_id     text references public.clients (id) on delete set null,
  project_slug  text check (project_slug ~ '^[a-z0-9-]{1,80}$'),
  media_asset_id text references public.media_assets (id) on delete set null,
  link_url      text check (link_url ~ '^https?://'),
  sort_order    integer not null default 0,
  is_sample     boolean not null default false,       -- fictional layout samples; the public policy below never returns them
  published     boolean not null default false,
  permission_confirmed boolean not null default false, -- must be true before publishing
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint publish_needs_permission check (not published or (permission_confirmed and not is_sample))
);

alter table public.clients enable row level security;
alter table public.client_projects enable row level security;
alter table public.testimonials enable row level security;
revoke all on public.clients, public.client_projects, public.testimonials from anon, authenticated;
grant select on public.clients, public.client_projects, public.testimonials to anon, authenticated;
grant insert, update, delete on public.clients, public.client_projects, public.testimonials to authenticated;

create policy "public reads published clients" on public.clients for select to anon, authenticated using (published);
create policy "public reads links of published clients" on public.client_projects for select to anon, authenticated using (exists (select 1 from public.clients c where c.id = client_id and c.published));
create policy "public reads published testimonials" on public.testimonials for select to anon, authenticated using (published and not is_sample and permission_confirmed);
create policy "admins manage clients" on public.clients for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());
create policy "admins manage client links" on public.client_projects for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());
create policy "admins manage testimonials" on public.testimonials for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());
