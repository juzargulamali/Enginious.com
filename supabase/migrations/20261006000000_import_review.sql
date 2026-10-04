-- Milestone 2 / 6: starter imports are DRAFT-ONLY and take over the public site only through an explicit, reviewed step.
--
-- Why: the public site shows built-in starter content for every type the CMS has not taken over. Importing the starter content
-- must never change what visitors see. A type becomes CMS-authoritative only when an administrator confirms, in one step,
-- that the imported drafts were reviewed (cms_publish_reviewed_import). Until then nothing of that type can be published at
-- all (cms_publish refuses), so a stray first publish cannot silently replace the whole starter set.

do $prereq$
begin
  if to_regprocedure('public.cms_publish(uuid)') is null or to_regprocedure('public.cms_type_initialised()') is null then
    raise exception 'ABORTED: apply 20261005010000_cms_content.sql and 20261005040000_cms_public_helpers.sql first. Nothing was changed.' using errcode = 'P0001';
  end if;
end
$prereq$;

alter table public.content_items add column if not exists imported_at timestamptz;   -- set by "Import starter content"; marks a draft awaiting review

create table if not exists public.cms_type_adoption (
  type        text primary key,
  adopted_at  timestamptz not null default now(),
  adopted_by  uuid references auth.users (id) on delete set null
);
alter table public.cms_type_adoption enable row level security;
revoke all on public.cms_type_adoption from anon, authenticated;
grant select on public.cms_type_adoption to authenticated;
create policy "staff read adoption" on public.cms_type_adoption for select to authenticated using (public.cms_is_staff());

-- Types that have built-in starter content on the public site (kept in step with src/lib/content/seed.ts).
create or replace function public.cms_has_starter(p_type text)
returns boolean language sql immutable set search_path = '' as $$
  select p_type = any (array['project', 'technology', 'person', 'client', 'region', 'company_section', 'solution', 'setting', 'page_seo'])
$$;

-- Public: which types are served from the CMS instead of the starter content. A starter-backed type only counts once adopted;
-- other types (articles, careers, FAQs, testimonials) count as soon as something of that type is published.
create or replace function public.cms_type_initialised()
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct t), '{}') from (
    select type as t from public.cms_type_adoption
    union
    select type from public.content_published where not public.cms_has_starter(type)
  ) x
$$;

-- cms_publish keeps its signature; the original body becomes cms_publish_core, which only cms_publish may call.
alter function public.cms_publish(uuid) rename to cms_publish_core;
revoke all on function public.cms_publish_core(uuid) from public, anon, authenticated;

create or replace function public.cms_publish(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  perform public.cms_assert_staff();
  select type into t from public.content_items where id = p_id;
  if t is not null and public.cms_has_starter(t)
     and not exists (select 1 from public.cms_type_adoption a where a.type = t)
     and coalesce(current_setting('app.cms_adopting', true), '') <> '1' then
    raise exception 'validation: This content type still shows the built-in starter content on the live site. An administrator must first use "Review and publish imported content" for this type.' using errcode = 'P0001';
  end if;
  return public.cms_publish_core(p_id);
end $$;
revoke all on function public.cms_publish(uuid) from public, anon;
grant execute on function public.cms_publish(uuid) to authenticated;

-- The explicit reviewed publishing step. Administrator only. All-or-nothing: if any imported draft fails publish validation
-- nothing is published and the live site is unchanged.
create or replace function public.cms_publish_reviewed_import(p_type text, p_reviewed boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0;
begin
  if not public.cms_is_administrator() then raise exception 'Not authorised.' using errcode = '42501'; end if;
  if p_reviewed is distinct from true then raise exception 'validation: Confirm that you have reviewed the imported content.' using errcode = 'P0001'; end if;
  if not public.cms_has_starter(p_type) then raise exception 'validation: This content type has no starter content.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.cms_type_adoption where type = p_type) then raise exception 'validation: This type is already published from the CMS.' using errcode = 'P0001'; end if;
  perform set_config('app.cms_adopting', '1', true);
  for r in select id, title from public.content_items where type = p_type and status = 'draft' and imported_at is not null order by sort_order, title loop
    begin
      perform public.cms_publish(r.id);
      n := n + 1;
    exception when sqlstate 'P0001' then
      raise exception 'validation: "%" cannot be published yet (%). Nothing was published.', r.title, regexp_replace(sqlerrm, '^validation: ', '') using errcode = 'P0001';
    end;
  end loop;
  if n = 0 then raise exception 'validation: There are no imported drafts to publish for this type.' using errcode = 'P0001'; end if;
  insert into public.cms_type_adoption (type, adopted_by) values (p_type, auth.uid());
  perform public.cms_audit_log('content.adopt', p_type, jsonb_build_object('items', n));
  return n;
end $$;
revoke all on function public.cms_publish_reviewed_import(text, boolean) from public, anon;
grant execute on function public.cms_publish_reviewed_import(text, boolean) to authenticated;
