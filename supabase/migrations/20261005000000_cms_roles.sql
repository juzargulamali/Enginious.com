-- Milestone 2 / 1: CMS roles (invite-only), role helper functions, audit log.
-- Roles: administrator (manages access, settings, deletion) and editor (content + enquiries).
-- Nobody can grant themselves a role: the only writers are administrators (RLS) and the service role (invites, server only).

create table if not exists public.cms_roles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  role         text not null check (role in ('administrator', 'editor')),
  email        text,
  display_name text check (char_length(display_name) <= 120),
  invited_by   uuid references auth.users (id) on delete set null,
  disabled     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Carry over anyone from the Milestone 1 allow-list as administrator.
insert into public.cms_roles (user_id, role)
select user_id, 'administrator' from public.cms_admins
on conflict (user_id) do nothing;

create or replace function public.cms_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.cms_roles where user_id = auth.uid() and not disabled
$$;

create or replace function public.cms_is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cms_roles where user_id = auth.uid() and not disabled)
$$;

create or replace function public.cms_is_administrator()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.cms_roles where user_id = auth.uid() and not disabled and role = 'administrator')
$$;

-- Milestone 1 name, now meaning administrator only (it used to mean "any CMS user").
create or replace function public.is_cms_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.cms_is_administrator()
$$;

revoke all on function public.cms_role(), public.cms_is_staff(), public.cms_is_administrator(), public.is_cms_admin() from public, anon;
grant execute on function public.cms_role(), public.cms_is_staff(), public.cms_is_administrator(), public.is_cms_admin() to authenticated;

alter table public.cms_roles enable row level security;
revoke all on public.cms_roles from anon, authenticated;
grant select on public.cms_roles to authenticated;
grant update (role, disabled, display_name) on public.cms_roles to authenticated;
grant delete on public.cms_roles to authenticated;

create policy "staff read own role, administrators read all" on public.cms_roles
  for select to authenticated using (user_id = auth.uid() or public.cms_is_administrator());
create policy "administrators update roles" on public.cms_roles
  for update to authenticated using (public.cms_is_administrator()) with check (public.cms_is_administrator());
create policy "administrators delete roles" on public.cms_roles
  for delete to authenticated using (public.cms_is_administrator());
-- No INSERT policy: roles are created only by the server (service role) after an administrator invites someone.

-- Never leave the CMS without an active administrator.
create or replace function public.cms_roles_keep_an_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
declare remaining int;
begin
  if tg_op = 'UPDATE' then
    if new.updated_at is not distinct from old.updated_at then new.updated_at := now(); end if;
    if not (old.role = 'administrator' and not old.disabled) or (new.role = 'administrator' and not new.disabled) then
      return new;
    end if;
  end if;
  select count(*) into remaining from public.cms_roles
   where role = 'administrator' and not disabled and user_id <> old.user_id;
  if remaining = 0 then
    raise exception 'The last active administrator cannot be removed, demoted or disabled.' using errcode = 'P0001';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger cms_roles_keep_an_admin before update or delete on public.cms_roles
  for each row execute function public.cms_roles_keep_an_admin();

-- Audit trail for sensitive actions (access changes, deletions, purges). Written only by functions / the server.
create table if not exists public.cms_audit (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  actor       uuid,
  actor_email text,
  action      text not null check (char_length(action) <= 80),
  target      text check (char_length(target) <= 200),
  detail      jsonb not null default '{}'::jsonb
);
alter table public.cms_audit enable row level security;
revoke all on public.cms_audit from anon, authenticated;
grant select on public.cms_audit to authenticated;
create policy "administrators read audit" on public.cms_audit for select to authenticated using (public.cms_is_administrator());

create or replace function public.cms_audit_log(p_action text, p_target text, p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Only CMS users may write audit entries, and only from the app's fixed set of actions (no forging, no flooding).
  if not public.cms_is_staff() then raise exception 'Not authorised.' using errcode = '42501'; end if;
  if p_action !~ '^(user|content|media|enquiry|enquiries)\.[a-z_]+$' then raise exception 'Unknown audit action.' using errcode = 'P0001'; end if;
  if pg_column_size(coalesce(p_detail, '{}'::jsonb)) > 2048 then raise exception 'Audit detail too large.' using errcode = 'P0001'; end if;
  insert into public.cms_audit (actor, actor_email, action, target, detail)
  values (auth.uid(), (select email from public.cms_roles where user_id = auth.uid()), left(p_action, 80), left(p_target, 200), coalesce(p_detail, '{}'::jsonb));
end $$;
revoke all on function public.cms_audit_log(text, text, jsonb) from public, anon;
grant execute on function public.cms_audit_log(text, text, jsonb) to authenticated;
