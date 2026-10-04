-- Milestone 2 / 4: enquiries workflow (notes, attachments, notification status), persistent rate limiting, retention.
-- The public can still never read or write this table: only the server (service role) inserts; staff read and triage.

-- Prerequisite check: stop with a clear message instead of failing half way through.
do $prereq$
declare missing text[] := '{}';
begin
  if to_regclass('public.enquiries') is null then missing := array_append(missing, 'public.enquiries (20261003010000_enquiries.sql)'); end if;
  if to_regprocedure('public.cms_is_staff()') is null then missing := array_append(missing, 'public.cms_is_staff() (20261005000000_cms_roles.sql)'); end if;
  if cardinality(missing) > 0 then
    raise exception 'ABORTED: earlier migrations are missing (20261003010000_enquiries.sql): %. Apply the earlier migrations in order first (docs/cms-setup.md). Nothing was changed.', array_to_string(missing, ', ') using errcode = 'P0001';
  end if;
end
$prereq$;

alter table public.enquiries
  add column if not exists notification_status   text not null default 'pending' check (notification_status in ('pending', 'sent', 'failed', 'skipped')),
  add column if not exists notification_error    text check (char_length(notification_error) <= 300),
  add column if not exists notification_attempts integer not null default 0,
  add column if not exists notification_last_at  timestamptz,
  add column if not exists attachment_count      integer not null default 0 check (attachment_count between 0 and 3),
  add column if not exists updated_at            timestamptz not null default now(),
  add column if not exists handled_by            uuid references auth.users (id) on delete set null;

create index if not exists enquiries_status_idx on public.enquiries (status, created_at desc);

-- Staff may triage; nothing else about an enquiry can be edited from the browser.
revoke update on public.enquiries from authenticated;
grant update (status, handled_by) on public.enquiries to authenticated;
drop policy if exists "cms admins read enquiries" on public.enquiries;
drop policy if exists "cms admins update enquiry status" on public.enquiries;
create policy "staff read enquiries" on public.enquiries for select to authenticated using (public.cms_is_staff());
create policy "staff triage enquiries" on public.enquiries for update to authenticated
  using (public.cms_is_staff()) with check (public.cms_is_staff());
grant delete on public.enquiries to authenticated;
create policy "administrators delete enquiries" on public.enquiries for delete to authenticated using (public.cms_is_administrator());

create or replace function public.enquiries_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status or new.notification_status is distinct from old.notification_status then new.updated_at := now(); end if;
  if new.status is distinct from old.status and auth.uid() is not null then new.handled_by := auth.uid(); end if;
  return new;
end $$;
drop trigger if exists enquiries_touch on public.enquiries;
create trigger enquiries_touch before update on public.enquiries for each row execute function public.enquiries_touch();

create table if not exists public.enquiry_notes (
  id           uuid primary key default gen_random_uuid(),
  enquiry_id   uuid not null references public.enquiries (id) on delete cascade,
  author       uuid references auth.users (id) on delete set null,
  author_email text,
  body         text not null check (char_length(body) between 1 and 4000),
  created_at   timestamptz not null default now()
);
create index if not exists enquiry_notes_enquiry_idx on public.enquiry_notes (enquiry_id, created_at);
alter table public.enquiry_notes enable row level security;
revoke all on public.enquiry_notes from anon, authenticated;
grant select, insert on public.enquiry_notes to authenticated;
create policy "staff read notes" on public.enquiry_notes for select to authenticated using (public.cms_is_staff());
create policy "staff add notes" on public.enquiry_notes for insert to authenticated
  with check (public.cms_is_staff() and author = auth.uid());

create table if not exists public.enquiry_attachments (
  id            uuid primary key default gen_random_uuid(),
  enquiry_id    uuid not null references public.enquiries (id) on delete cascade,
  storage_path  text not null unique,
  original_name text not null check (char_length(original_name) <= 200),
  mime          text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  bytes         integer not null check (bytes > 0),
  created_at    timestamptz not null default now()
);
alter table public.enquiry_attachments enable row level security;
revoke all on public.enquiry_attachments from anon, authenticated;
grant select on public.enquiry_attachments to authenticated;
create policy "staff read attachment records" on public.enquiry_attachments for select to authenticated using (public.cms_is_staff());
-- Attachment rows are written only by the server (service role) after the file has passed validation.

-- Persistent rate limiting that works on serverless (state lives in the database, not in a function instance).
create table if not exists public.rate_limits (
  key          text not null check (char_length(key) <= 120),
  window_start timestamptz not null,
  hits         integer not null default 1,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Fixed-window counter. Returns true when the call is ALLOWED. Callable by the service role only.
create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare ws timestamptz; n integer;
begin
  ws := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits as r (key, window_start, hits) values (p_key, ws, 1)
    on conflict (key, window_start) do update set hits = r.hits + 1
    returning hits into n;
  if random() < 0.02 then delete from public.rate_limits where window_start < now() - interval '2 days'; end if;
  return n <= p_limit;
end $$;
revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- Retention: administrators can purge old enquiries. Returns the attachment paths the server must delete from storage.
-- The retention period itself is an owner decision (see docs/privacy-retention.md); nothing runs automatically.
create or replace function public.cms_purge_enquiries(p_older_than_days integer, p_statuses text[] default array['closed', 'spam'])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare paths text[]; n integer;
begin
  if not public.cms_is_administrator() then raise exception 'Not authorised.' using errcode = '42501'; end if;
  if p_older_than_days < 30 then raise exception 'Retention must be at least 30 days.' using errcode = 'P0001'; end if;
  select coalesce(array_agg(a.storage_path), '{}') into paths
    from public.enquiry_attachments a join public.enquiries e on e.id = a.enquiry_id
   where e.created_at < now() - make_interval(days => p_older_than_days) and e.status = any (p_statuses);
  with d as (delete from public.enquiries e where e.created_at < now() - make_interval(days => p_older_than_days) and e.status = any (p_statuses) returning 1)
    select count(*) into n from d;
  perform public.cms_audit_log('enquiries.purge', p_older_than_days::text || ' days', jsonb_build_object('deleted', n, 'statuses', p_statuses));
  return jsonb_build_object('deleted', n, 'paths', to_jsonb(paths));
end $$;
revoke all on function public.cms_purge_enquiries(integer, text[]) from public, anon;
grant execute on function public.cms_purge_enquiries(integer, text[]) to authenticated;
