-- Media registry for the CMS: every public image is a row (file, alt text, focal point, crop, licence, status).
-- Public may read only published rows; only CMS admins write. Files live in a Storage bucket (created with the CMS stage).

create table if not exists public.media_assets (
  id           text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  kind         text not null check (kind in ('portrait', 'scene')),
  status       text not null check (status in ('real', 'stock', 'preview-portrait', 'concept', 'fictional-portrait')),
  published    boolean not null default false,
  storage_path text not null,                       -- e.g. photos/juzar-gulamali
  width        integer not null check (width > 0),
  height       integer not null check (height > 0),
  focal_x      numeric not null default 0.5 check (focal_x between 0 and 1),
  focal_y      numeric not null default 0.5 check (focal_y between 0 and 1),
  crop_aspect  text check (crop_aspect in ('1:1', '4:5', '3:4', '16:9', '21:9')),
  alt          text not null check (char_length(alt) <= 300),
  credit       text,
  source_url   text,
  licence      text
);

alter table public.media_assets enable row level security;
revoke all on public.media_assets from anon, authenticated;
grant select on public.media_assets to anon, authenticated;
grant insert, update, delete on public.media_assets to authenticated;

create policy "public reads published media" on public.media_assets for select to anon, authenticated using (published);
create policy "admins read all media" on public.media_assets for select to authenticated using (public.is_cms_admin());
create policy "admins write media" on public.media_assets for all to authenticated using (public.is_cms_admin()) with check (public.is_cms_admin());
