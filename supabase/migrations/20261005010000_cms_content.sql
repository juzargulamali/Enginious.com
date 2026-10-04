-- Milestone 2 / 2: content engine. One generic, typed-by-the-app model for all CMS content types.
--
--   content_items      working copy (draft jsonb) + workflow state. STAFF ONLY. Never readable by the public.
--   content_published  immutable-ish snapshot of what is live. Public read. Written only by cms_publish().
--   content_revisions  recoverable history of saved drafts and published versions. STAFF ONLY.
--   redirects          validated redirect map (public read of enabled rows, used by the proxy).
--
-- Conventions inside `data`: keys starting with "_" are internal (approval flags, notes) and are stripped from the public snapshot.

-- Milestone 1 placeholders replaced by the generic model (they were never written to by the app).
drop table if exists public.client_projects cascade;
drop table if exists public.testimonials cascade;
drop table if exists public.clients cascade;

create table if not exists public.content_items (
  id                uuid primary key default gen_random_uuid(),
  type              text not null check (type in (
                      'project', 'technology', 'solution', 'company_section', 'person', 'region', 'client',
                      'testimonial', 'article', 'role', 'faq', 'setting', 'page_seo')),
  locale            text not null default 'en' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  slug              text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title             text not null check (char_length(title) between 1 and 200),
  status            text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  draft             jsonb not null default '{}'::jsonb check (jsonb_typeof(draft) = 'object' and pg_column_size(draft) < 262144),
  sort_order        integer not null default 0,
  featured          boolean not null default false,
  translation_group uuid not null default gen_random_uuid(),  -- future English/Arabic: items sharing a group are translations of each other
  version           integer not null default 1,               -- increments on every draft change
  published_version integer,                                  -- the draft version that is live (null = not live)
  published_at      timestamptz,
  created_by        uuid references auth.users (id) on delete set null,
  updated_by        uuid references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (type, locale, slug)
);
create index if not exists content_items_list_idx on public.content_items (type, status, sort_order, updated_at desc);

create table if not exists public.content_published (
  item_id      uuid primary key references public.content_items (id) on delete cascade,
  type         text not null,
  locale       text not null,
  slug         text not null,
  title        text not null,
  data         jsonb not null,
  sort_order   integer not null default 0,
  featured     boolean not null default false,
  version      integer not null,
  published_at timestamptz not null default now(),
  unique (type, locale, slug)
);
create index if not exists content_published_type_idx on public.content_published (type, locale, sort_order);

create table if not exists public.content_revisions (
  id         bigint generated always as identity primary key,
  item_id    uuid not null references public.content_items (id) on delete cascade,
  kind       text not null check (kind in ('draft', 'published')),
  version    integer not null,
  title      text not null,
  slug       text not null,
  data       jsonb not null,
  note       text check (char_length(note) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists content_revisions_item_idx on public.content_revisions (item_id, id desc);

create table if not exists public.redirects (
  id          uuid primary key default gen_random_uuid(),
  source_path text not null unique check (source_path ~ '^/[A-Za-z0-9/_.~%-]*$' and char_length(source_path) <= 200
                                          and source_path !~ '^/(admin|api|_next)(/|$)'),
  target      text not null check (char_length(target) <= 500 and (target ~ '^/[A-Za-z0-9/_.~%?=&#-]*$' or target ~ '^https://[^\s]+$')),
  status_code integer not null default 301 check (status_code in (301, 302, 307, 308)),
  enabled     boolean not null default true,
  automatic   boolean not null default false,   -- created by a slug change
  note        text check (char_length(note) <= 300),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS / grants
alter table public.content_items enable row level security;
alter table public.content_published enable row level security;
alter table public.content_revisions enable row level security;
alter table public.redirects enable row level security;
revoke all on public.content_items, public.content_published, public.content_revisions, public.redirects from anon, authenticated;

grant select, insert on public.content_items to authenticated;
grant update (title, slug, draft, sort_order, featured) on public.content_items to authenticated;
grant delete on public.content_items to authenticated;
create policy "staff read items" on public.content_items for select to authenticated using (public.cms_is_staff());
create policy "staff create items" on public.content_items for insert to authenticated
  with check (public.cms_is_staff() and status = 'draft' and published_version is null and published_at is null);
create policy "staff edit items" on public.content_items for update to authenticated
  using (public.cms_is_staff()) with check (public.cms_is_staff());
create policy "administrators delete items" on public.content_items for delete to authenticated using (public.cms_is_administrator());

-- Public: only the published snapshot (no drafts, no internal "_" keys; those are stripped when publishing).
grant select on public.content_published to anon, authenticated;
create policy "public reads live content" on public.content_published for select to anon, authenticated using (true);

grant select on public.content_revisions to authenticated;
create policy "staff read revisions" on public.content_revisions for select to authenticated using (public.cms_is_staff());

grant select on public.redirects to anon, authenticated;
grant insert, update, delete on public.redirects to authenticated;
create policy "public reads enabled redirects" on public.redirects for select to anon, authenticated using (enabled);
create policy "staff read all redirects" on public.redirects for select to authenticated using (public.cms_is_staff());
create policy "staff write redirects" on public.redirects for all to authenticated
  using (public.cms_is_staff()) with check (public.cms_is_staff());

-- ---------------------------------------------------------------- triggers: versions, revisions, audit
create or replace function public.content_items_before()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid(); new.updated_by := auth.uid(); new.version := 1;
    new.status := 'draft'; new.published_version := null; new.published_at := null;
    return new;
  end if;
  -- Locked columns can only change through the cms_* functions (which set app.cms_internal).
  if coalesce(current_setting('app.cms_internal', true), '') <> '1' then
    new.id := old.id; new.type := old.type; new.locale := old.locale; new.status := old.status;
    new.published_version := old.published_version; new.published_at := old.published_at;
    new.translation_group := old.translation_group; new.created_by := old.created_by; new.created_at := old.created_at;
  end if;
  if new.draft is distinct from old.draft or new.title is distinct from old.title or new.slug is distinct from old.slug then
    new.version := old.version + 1;
    new.updated_at := now();
    new.updated_by := auth.uid();
  end if;
  return new;
end $$;
create trigger content_items_before before insert or update on public.content_items
  for each row execute function public.content_items_before();

create or replace function public.content_items_after()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.version is distinct from old.version then
    insert into public.content_revisions (item_id, kind, version, title, slug, data, created_by)
    values (new.id, 'draft', new.version, new.title, new.slug, new.draft, auth.uid());
    -- keep the 60 most recent draft revisions
    delete from public.content_revisions r
     where r.item_id = new.id and r.kind = 'draft'
       and r.id not in (select id from public.content_revisions where item_id = new.id and kind = 'draft' order by id desc limit 60);
  end if;
  return null;
end $$;
create trigger content_items_after after insert or update on public.content_items
  for each row execute function public.content_items_after();

-- ---------------------------------------------------------------- publish-time validation (backstop; the app shows field-level messages first)
create or replace function public.cms_validate_publish(p_type text, p_title text, p_slug text, p_data jsonb)
returns text[] language plpgsql immutable set search_path = '' as $$
declare problems text[] := '{}';
begin
  if coalesce(trim(p_title), '') = '' then problems := array_append(problems, 'Title is required.'); end if;
  if p_type = 'testimonial' then
    if char_length(coalesce(p_data ->> 'quote', '')) < 10 then problems := array_append(problems, 'Quote is required (at least 10 characters).'); end if;
    if coalesce(p_data ->> 'speaker_name', '') = '' then problems := array_append(problems, 'Speaker name is required.'); end if;
    if coalesce(p_data ->> 'speaker_role', '') = '' then problems := array_append(problems, 'Speaker role is required.'); end if;
    if coalesce(p_data ->> 'organisation', '') = '' then problems := array_append(problems, 'Organisation is required.'); end if;
    if coalesce(p_data ->> '_permission_confirmed', 'false') <> 'true' then problems := array_append(problems, 'Written permission must be confirmed before a testimonial is published.'); end if;
    if coalesce(p_data ->> '_sample', 'false') = 'true' then problems := array_append(problems, 'Sample (fictional) testimonials can never be published.'); end if;
  elsif p_type = 'client' then
    if coalesce(p_data ->> 'relationship', 'unconfirmed') in ('direct', 'agency') then
      if coalesce(p_data ->> '_relationship_approved', 'false') <> 'true' then problems := array_append(problems, 'The client relationship (direct or agency) must be approved before it is published.'); end if;
      if coalesce(p_data ->> 'attribution', '') = '' then problems := array_append(problems, 'Approved attribution wording is required for a direct or agency relationship.'); end if;
    end if;
  elsif p_type = 'person' then
    if coalesce(p_data ->> 'role', '') = '' then problems := array_append(problems, 'Role is required.'); end if;
    if coalesce(p_data ->> 'department', '') = '' then problems := array_append(problems, 'Department is required.'); end if;
  elsif p_type = 'project' then
    if coalesce(p_data ->> 'summary', '') = '' then problems := array_append(problems, 'Summary is required.'); end if;
  elsif p_type = 'technology' then
    if coalesce(p_data ->> 'summary', '') = '' then problems := array_append(problems, 'Summary is required.'); end if;
    if coalesce(p_data ->> 'category', '') = '' then problems := array_append(problems, 'Category is required.'); end if;
  elsif p_type = 'article' then
    if coalesce(p_data ->> 'body', '') = '' then problems := array_append(problems, 'Article body is required.'); end if;
    if coalesce(p_data ->> 'excerpt', '') = '' then problems := array_append(problems, 'Excerpt is required.'); end if;
  elsif p_type = 'role' then
    if coalesce(p_data ->> 'description', '') = '' then problems := array_append(problems, 'Description is required.'); end if;
    if coalesce(p_data ->> 'location', '') = '' then problems := array_append(problems, 'Location is required.'); end if;
    if coalesce(p_data ->> 'apply_url', '') = '' and coalesce(p_data ->> 'apply_email', '') = '' then problems := array_append(problems, 'An application link or email is required.'); end if;
  elsif p_type = 'faq' then
    if coalesce(p_data ->> 'answer', '') = '' then problems := array_append(problems, 'Answer is required.'); end if;
  elsif p_type = 'region' then
    if coalesce(p_data ->> 'email', '') <> '' and (p_data ->> 'email') !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then problems := array_append(problems, 'Contact email is not a valid address.'); end if;
  end if;
  return problems;
end $$;

create or replace function public.cms_public_data(p_type text, p_data jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  -- strip internal keys; hide a leadership message until it is approved
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
    from jsonb_each(case when p_type = 'person' and coalesce(p_data ->> '_message_approved', 'false') <> 'true' then p_data - 'message' else p_data end) as e(k, v)
   where left(k, 1) <> '_'
$$;

create or replace function public.cms_path_prefix(p_type text)
returns text language sql immutable set search_path = '' as $$
  select case p_type when 'project' then '/work/' when 'technology' then '/technologies/' when 'article' then '/insights/' when 'role' then '/careers/' end
$$;

-- ---------------------------------------------------------------- workflow functions (all require a CMS role; editors and administrators may publish)
create or replace function public.cms_assert_staff() returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.cms_is_staff() then raise exception 'Not authorised.' using errcode = '42501'; end if;
end $$;

create or replace function public.cms_publish(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare it public.content_items; problems text[]; old_slug text; pub jsonb;
begin
  perform public.cms_assert_staff();
  select * into it from public.content_items where id = p_id for update;
  if not found then raise exception 'Content not found.' using errcode = 'P0002'; end if;
  if it.status = 'archived' then raise exception 'Restore archived content before publishing it.' using errcode = 'P0001'; end if;
  problems := public.cms_validate_publish(it.type, it.title, it.slug, it.draft);
  if cardinality(problems) > 0 then
    raise exception 'validation: %', array_to_string(problems, ' | ') using errcode = 'P0001';
  end if;
  pub := public.cms_public_data(it.type, it.draft);
  select slug into old_slug from public.content_published where item_id = p_id;

  perform set_config('app.cms_internal', '1', true);
  insert into public.content_published (item_id, type, locale, slug, title, data, sort_order, featured, version, published_at)
  values (it.id, it.type, it.locale, it.slug, it.title, pub, it.sort_order, it.featured, it.version, now())
  on conflict (item_id) do update
    set slug = excluded.slug, title = excluded.title, data = excluded.data, sort_order = excluded.sort_order,
        featured = excluded.featured, version = excluded.version, published_at = excluded.published_at;
  update public.content_items set status = 'published', published_version = it.version, published_at = now() where id = p_id;
  insert into public.content_revisions (item_id, kind, version, title, slug, data, created_by)
  values (it.id, 'published', it.version, it.title, it.slug, it.draft, auth.uid());
  delete from public.content_revisions r where r.item_id = p_id and r.kind = 'published'
     and r.id not in (select id from public.content_revisions where item_id = p_id and kind = 'published' order by id desc limit 30);

  -- A published URL that changed keeps working: add an automatic redirect from the old path.
  if old_slug is not null and old_slug <> it.slug and public.cms_path_prefix(it.type) is not null then
    insert into public.redirects (source_path, target, status_code, automatic, note, created_by)
    values (public.cms_path_prefix(it.type) || old_slug, public.cms_path_prefix(it.type) || it.slug, 301, true, 'Created automatically when the slug changed', auth.uid())
    on conflict (source_path) do update set target = excluded.target, enabled = true, automatic = true;
  end if;
  return jsonb_build_object('ok', true, 'version', it.version);
exception when unique_violation then
  raise exception 'Another published % already uses the slug "%".', it.type, it.slug using errcode = 'P0001';
end $$;

create or replace function public.cms_unpublish(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.cms_assert_staff();
  perform set_config('app.cms_internal', '1', true);
  delete from public.content_published where item_id = p_id;
  update public.content_items set status = 'draft', published_version = null, published_at = null where id = p_id and status = 'published';
end $$;

create or replace function public.cms_archive(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.cms_assert_staff();
  perform set_config('app.cms_internal', '1', true);
  delete from public.content_published where item_id = p_id;
  update public.content_items set status = 'archived', published_version = null, published_at = null where id = p_id;
end $$;

create or replace function public.cms_restore(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.cms_assert_staff();
  perform set_config('app.cms_internal', '1', true);
  update public.content_items set status = 'draft' where id = p_id and status = 'archived';
end $$;

create or replace function public.cms_restore_revision(p_id uuid, p_revision_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.content_revisions;
begin
  perform public.cms_assert_staff();
  select * into r from public.content_revisions where id = p_revision_id and item_id = p_id;
  if not found then raise exception 'Revision not found.' using errcode = 'P0002'; end if;
  -- Restores the content and title as a NEW draft version (slug is left alone so URLs do not change by accident).
  update public.content_items set draft = r.data, title = r.title where id = p_id;
end $$;

create or replace function public.cms_slug_available(p_type text, p_slug text, p_locale text, p_except uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.cms_assert_staff();
  return not exists (select 1 from public.content_items where type = p_type and locale = p_locale and slug = p_slug and id is distinct from p_except);
end $$;

-- ---------------------------------------------------------------- redirect validation: loops and unsafe targets
create or replace function public.cms_redirect_host_allowed(p_target text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare host text; allowed jsonb;
begin
  if p_target ~ '^/' then return true; end if;
  host := lower(substring(p_target from '^https://([^/?#:]+)'));
  select data -> 'redirect_hosts' into allowed from public.content_published where type = 'setting' and slug = 'site';
  return allowed is not null and jsonb_typeof(allowed) = 'array' and allowed ? host;
end $$;

create or replace function public.redirects_validate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare hops int := 0; cur text; nxt text;
begin
  new.updated_at := now();
  if new.target = new.source_path then raise exception 'A redirect cannot point at itself.' using errcode = 'P0001'; end if;
  if not public.cms_redirect_host_allowed(new.target) then
    raise exception 'External redirect targets must use a host listed under "Allowed redirect hosts" in Site settings.' using errcode = 'P0001';
  end if;
  cur := split_part(split_part(new.target, '?', 1), '#', 1);
  while cur ~ '^/' and hops < 12 loop
    if cur = new.source_path then raise exception 'This redirect would create a loop.' using errcode = 'P0001'; end if;
    select r.target into nxt from public.redirects r where r.source_path = cur and r.enabled and r.id is distinct from new.id;
    exit when nxt is null;
    cur := split_part(split_part(nxt, '?', 1), '#', 1);
    hops := hops + 1;
  end loop;
  if hops >= 12 then raise exception 'Redirect chain is too long (possible loop).' using errcode = 'P0001'; end if;
  return new;
end $$;
create trigger redirects_validate before insert or update on public.redirects
  for each row execute function public.redirects_validate();

revoke all on function public.cms_publish(uuid), public.cms_unpublish(uuid), public.cms_archive(uuid), public.cms_restore(uuid),
  public.cms_restore_revision(uuid, bigint), public.cms_slug_available(text, text, text, uuid), public.cms_assert_staff() from public, anon;
grant execute on function public.cms_publish(uuid), public.cms_unpublish(uuid), public.cms_archive(uuid), public.cms_restore(uuid),
  public.cms_restore_revision(uuid, bigint), public.cms_slug_available(text, text, text, uuid) to authenticated;
revoke all on function public.cms_validate_publish(text, text, text, jsonb), public.cms_public_data(text, jsonb), public.cms_path_prefix(text),
  public.cms_redirect_host_allowed(text) from public, anon;
grant execute on function public.cms_validate_publish(text, text, text, jsonb) to authenticated;
