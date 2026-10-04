-- Milestone 2 / 3: media library + storage buckets and policies.
--
-- Buckets
--   media                public   processed image derivatives (480/960/1600 px WebP) with random paths
--   documents            public   approved public downloads (company profile PDF)
--   private              private  originals and unpublished/sensitive media; served only through short-lived signed URLs
--   enquiry-attachments  private  files visitors attach to an enquiry; written only by the server (service role), read only by staff
--
-- Image/PDF validation (type, signature, size, dimensions) happens on the server before anything is stored; SVG is refused.

alter table public.media_assets
  add column if not exists caption       text check (char_length(caption) <= 400),
  add column if not exists mime          text,
  add column if not exists bytes         integer check (bytes >= 0),
  add column if not exists original_name text check (char_length(original_name) <= 200),
  add column if not exists visibility    text not null default 'public' check (visibility in ('public', 'private')),
  add column if not exists variants      integer[] not null default '{}',
  add column if not exists title         text check (char_length(title) <= 200),
  add column if not exists created_by    uuid references auth.users (id) on delete set null;

alter table public.media_assets drop constraint if exists media_assets_kind_check;
alter table public.media_assets add constraint media_assets_kind_check check (kind in ('portrait', 'scene', 'logo', 'document'));
alter table public.media_assets alter column width drop not null;
alter table public.media_assets alter column height drop not null;
alter table public.media_assets drop constraint if exists media_assets_width_check;
alter table public.media_assets drop constraint if exists media_assets_height_check;
alter table public.media_assets add constraint media_assets_dims_check check ((width is null or width > 0) and (height is null or height > 0));
alter table public.media_assets drop constraint if exists media_assets_status_check;
alter table public.media_assets add constraint media_assets_status_check check (status in ('real', 'stock', 'preview-portrait', 'concept', 'fictional-portrait'));

-- Re-create policies: any CMS user (editor or administrator) manages media; deletion goes through cms_delete_media().
drop policy if exists "admins read all media" on public.media_assets;
drop policy if exists "admins write media" on public.media_assets;
drop policy if exists "public reads published media" on public.media_assets;
create policy "public reads published public media" on public.media_assets
  for select to anon, authenticated using (published and visibility = 'public');
create policy "staff read all media" on public.media_assets for select to authenticated using (public.cms_is_staff());
create policy "staff create media" on public.media_assets for insert to authenticated with check (public.cms_is_staff());
create policy "staff edit media" on public.media_assets for update to authenticated
  using (public.cms_is_staff()) with check (public.cms_is_staff());
revoke delete on public.media_assets from authenticated;

create or replace function public.cms_media_references(p_id text)
returns table (item_id uuid, type text, slug text, title text, in_published boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.cms_assert_staff();
  return query
    select i.id, i.type, i.slug, i.title,
           exists (select 1 from public.content_published p where p.item_id = i.id and p.data::text like '%"' || p_id || '"%')
      from public.content_items i
     where i.draft::text like '%"' || p_id || '"%'
        or exists (select 1 from public.content_published p where p.item_id = i.id and p.data::text like '%"' || p_id || '"%');
end $$;

-- Delete only when nothing refers to the asset (published OR draft). Returns the storage paths the server must now remove.
create or replace function public.cms_delete_media(p_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.media_assets; refs int;
begin
  perform public.cms_assert_staff();
  select * into m from public.media_assets where id = p_id for update;
  if not found then raise exception 'Media not found.' using errcode = 'P0002'; end if;
  select count(*) into refs from public.cms_media_references(p_id);
  if refs > 0 then
    raise exception 'This media is used by % content item(s). Remove it from them first.', refs using errcode = 'P0001';
  end if;
  delete from public.media_assets where id = p_id;
  perform public.cms_audit_log('media.delete', p_id, jsonb_build_object('path', m.storage_path));
  return jsonb_build_object('storage_path', m.storage_path, 'visibility', m.visibility, 'kind', m.kind, 'variants', m.variants);
end $$;
revoke all on function public.cms_media_references(text), public.cms_delete_media(text) from public, anon;
grant execute on function public.cms_media_references(text), public.cms_delete_media(text) to authenticated;

-- ---------------------------------------------------------------- buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media', 'media', true, 4194304, array['image/webp']),
  ('documents', 'documents', true, 15728640, array['application/pdf']),
  ('private', 'private', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('enquiry-attachments', 'enquiry-attachments', false, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff manage public media files" on storage.objects;
drop policy if exists "staff manage private files" on storage.objects;
drop policy if exists "staff read enquiry attachments" on storage.objects;
drop policy if exists "administrators delete enquiry attachments" on storage.objects;

-- Public buckets are readable by URL (Supabase serves them directly); only staff may change them.
create policy "staff manage public media files" on storage.objects for all to authenticated
  using (bucket_id in ('media', 'documents') and public.cms_is_staff())
  with check (bucket_id in ('media', 'documents') and public.cms_is_staff());
create policy "staff manage private files" on storage.objects for all to authenticated
  using (bucket_id = 'private' and public.cms_is_staff())
  with check (bucket_id = 'private' and public.cms_is_staff());
-- Enquiry attachments: staff can read; uploads happen only through the server with the service role.
create policy "staff read enquiry attachments" on storage.objects for select to authenticated
  using (bucket_id = 'enquiry-attachments' and public.cms_is_staff());
create policy "administrators delete enquiry attachments" on storage.objects for delete to authenticated
  using (bucket_id = 'enquiry-attachments' and public.cms_is_administrator());
