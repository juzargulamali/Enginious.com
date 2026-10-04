-- LOCAL database security tests (run with scripts/test/rls.sh against the throw-away test database).
-- Each check runs a statement as a given Postgres role + JWT subject and compares the outcome.
\set ON_ERROR_STOP off
create schema if not exists t;
create table if not exists t.results (n serial, name text, ok boolean, got text);
truncate t.results;

create or replace function t.run(p_role text, p_uid uuid, p_sql text) returns text language plpgsql as $$
declare n bigint; res text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
  execute format('set local role %I', p_role);
  begin
    execute p_sql;
    get diagnostics n = row_count;
    res := 'ok:' || n;
  exception when others then
    res := 'err:' || sqlstate;
  end;
  reset role;
  return res;
end $$;

create or replace function t.expect(p_name text, p_role text, p_uid uuid, p_sql text, p_want text) returns void language plpgsql as $$
declare got text;
begin
  got := t.run(p_role, p_uid, p_sql);
  insert into t.results (name, ok, got) values (p_name || '  [want ' || p_want || ']', got like p_want, got);
end $$;

-- returns the scalar text result of a query run as a role (for value assertions)
create or replace function t.val(p_role text, p_uid uuid, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
  execute format('set local role %I', p_role);
  begin execute p_sql into v; exception when others then v := 'err:' || sqlstate; end;
  reset role;
  return v;
end $$;
create or replace function t.eq(p_name text, p_role text, p_uid uuid, p_sql text, p_want text) returns void language plpgsql as $$
declare got text;
begin
  got := t.val(p_role, p_uid, p_sql);
  insert into t.results (name, ok, got) values (p_name || '  [want ' || p_want || ']', got is not distinct from p_want, got);
end $$;

-- users: administrator A, editor E, signed-up outsider O with no role
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.local'),
  ('00000000-0000-0000-0000-00000000000e', 'editor@test.local'),
  ('00000000-0000-0000-0000-0000000000f0', 'outsider@test.local'),
  ('00000000-0000-0000-0000-0000000000b0', 'admin2@test.local') on conflict do nothing;
insert into public.cms_roles (user_id, role, email) values
  ('00000000-0000-0000-0000-00000000000a', 'administrator', 'admin@test.local'),
  ('00000000-0000-0000-0000-00000000000e', 'editor', 'editor@test.local') on conflict do nothing;

\set A '00000000-0000-0000-0000-00000000000a'
\set E '00000000-0000-0000-0000-00000000000e'
\set O '00000000-0000-0000-0000-0000000000f0'
\set B '00000000-0000-0000-0000-0000000000b0'

-- ============ roles and escalation
select t.expect('anon cannot read cms_roles', 'anon', null, 'select * from public.cms_roles', 'err:42501');
select t.eq('outsider (signed up, no role) sees no roles', 'authenticated', :'O', 'select count(*) from public.cms_roles', '0');
select t.expect('outsider cannot insert a role for self', 'authenticated', :'O', format($q$insert into public.cms_roles (user_id, role) values (%L, 'administrator')$q$, :'O'), 'err:42501');
select t.expect('editor cannot insert a role', 'authenticated', :'E', format($q$insert into public.cms_roles (user_id, role) values (%L, 'administrator')$q$, :'O'), 'err:42501');
select t.expect('editor cannot promote self (update affects 0 rows)', 'authenticated', :'E', format($q$update public.cms_roles set role = 'administrator' where user_id = %L$q$, :'E'), 'ok:0');
select t.eq('editor is still an editor', 'authenticated', :'E', 'select public.cms_role()', 'editor');
select t.eq('editor sees only own role row', 'authenticated', :'E', 'select count(*) from public.cms_roles', '1');
select t.eq('administrator sees all role rows', 'authenticated', :'A', 'select count(*) from public.cms_roles', '2');
select t.expect('editor cannot delete roles', 'authenticated', :'E', 'delete from public.cms_roles', 'ok:0');
select t.expect('last administrator cannot be demoted', 'authenticated', :'A', format($q$update public.cms_roles set role = 'editor' where user_id = %L$q$, :'A'), 'err:P0001');
select t.expect('administrator can disable an editor', 'authenticated', :'A', format($q$update public.cms_roles set disabled = true where user_id = %L$q$, :'E'), 'ok:1');
select t.eq('disabled editor has no role', 'authenticated', :'E', 'select coalesce(public.cms_role(), ''none'')', 'none');
select t.expect('administrator re-enables editor', 'authenticated', :'A', format($q$update public.cms_roles set disabled = false where user_id = %L$q$, :'E'), 'ok:1');
select t.expect('editor cannot read audit log', 'authenticated', :'E', 'select * from public.cms_audit', 'ok:0');
select t.expect('nobody can insert audit rows directly', 'authenticated', :'A', $q$insert into public.cms_audit (action) values ('x')$q$, 'err:42501');

-- ============ content: drafts are private
select t.expect('anon cannot read content_items (drafts)', 'anon', null, 'select * from public.content_items', 'err:42501');
select t.expect('outsider cannot create content', 'authenticated', :'O', $q$insert into public.content_items (type, slug, title) values ('project', 'x', 'X')$q$, 'err:42501');
select t.expect('outsider reads no drafts', 'authenticated', :'O', 'select * from public.content_items', 'ok:0');
select t.expect('outsider cannot publish', 'authenticated', :'O', $q$select public.cms_publish(gen_random_uuid())$q$, 'err:42501');
select t.expect('anon cannot call publish', 'anon', null, $q$select public.cms_publish(gen_random_uuid())$q$, 'err:42501');
select t.expect('editor can create a draft', 'authenticated', :'E', $q$insert into public.content_items (type, slug, title, draft) values ('project', 'alpha', 'Alpha', '{"summary":"Original summary","_note":"internal only"}')$q$, 'ok:1');
select t.expect('slug collision is rejected', 'authenticated', :'E', $q$insert into public.content_items (type, slug, title) values ('project', 'alpha', 'Alpha again')$q$, 'err:23505');
select t.expect('same slug allowed for another type', 'authenticated', :'E', $q$insert into public.content_items (type, slug, title, draft) values ('technology', 'alpha', 'Alpha tech', '{}')$q$, 'ok:1');
select t.expect('client cannot insert a published item directly', 'authenticated', :'E', $q$insert into public.content_items (type, slug, title, status) values ('project', 'sneaky', 'S', 'published')$q$, 'ok:1');
select t.eq('...but the status is forced to draft', 'authenticated', :'E', $q$select status from public.content_items where slug = 'sneaky'$q$, 'draft');
select t.expect('client cannot flip status by update', 'authenticated', :'E', $q$update public.content_items set status = 'published' where slug = 'sneaky'$q$, 'err:42501');
select t.expect('public sees nothing before publishing', 'anon', null, 'select * from public.content_published', 'ok:0');

-- publish
select t.expect('editor publishes a valid project', 'authenticated', :'E', $q$select public.cms_publish(id) from public.content_items where slug = 'alpha' and type = 'project'$q$, 'ok:1');
select t.eq('public sees the published title', 'anon', null, $q$select title from public.content_published where slug = 'alpha' and type = 'project'$q$, 'Alpha');
select t.eq('internal "_" keys are stripped from the public snapshot', 'anon', null, $q$select (data ? '_note')::text from public.content_published where slug = 'alpha' and type = 'project'$q$, 'false');
select t.expect('editor edits the draft', 'authenticated', :'E', $q$update public.content_items set title = 'Alpha EDITED', draft = '{"summary":"Edited summary"}' where slug = 'alpha' and type = 'project'$q$, 'ok:1');
select t.eq('a draft edit does not change the published title', 'anon', null, $q$select title from public.content_published where slug = 'alpha' and type = 'project'$q$, 'Alpha');
select t.eq('a draft edit does not change the published data', 'anon', null, $q$select data ->> 'summary' from public.content_published where slug = 'alpha' and type = 'project'$q$, 'Original summary');
select t.eq('item reports pending changes (version > published_version)', 'authenticated', :'E', $q$select (version > published_version)::text from public.content_items where slug = 'alpha' and type = 'project'$q$, 'true');
select t.expect('editor republishes', 'authenticated', :'E', $q$select public.cms_publish(id) from public.content_items where slug = 'alpha' and type = 'project'$q$, 'ok:1');
select t.eq('publishing updates the public page data', 'anon', null, $q$select data ->> 'summary' from public.content_published where slug = 'alpha' and type = 'project'$q$, 'Edited summary');
select t.eq('revision history keeps the earlier published version', 'authenticated', :'E', $q$select count(*) from public.content_revisions r join public.content_items i on i.id = r.item_id where i.slug = 'alpha' and i.type = 'project' and r.kind = 'published'$q$, '2');
select t.expect('restore the first draft revision', 'authenticated', :'E', $q$select public.cms_restore_revision(i.id, (select min(id) from public.content_revisions where item_id = i.id and kind = 'draft')) from public.content_items i where slug = 'alpha' and type = 'project'$q$, 'ok:1');
select t.eq('restoring creates a new draft and leaves the live page alone', 'anon', null, $q$select data ->> 'summary' from public.content_published where slug = 'alpha' and type = 'project'$q$, 'Edited summary');
select t.eq('restored draft carries the old content', 'authenticated', :'E', $q$select draft ->> 'summary' from public.content_items where slug = 'alpha' and type = 'project'$q$, 'Original summary');

-- slug change keeps URL working
select t.expect('editor renames the slug', 'authenticated', :'E', $q$update public.content_items set slug = 'alpha-renamed' where slug = 'alpha' and type = 'project'$q$, 'ok:1');
select t.expect('publishing the rename succeeds', 'authenticated', :'E', $q$select public.cms_publish(id) from public.content_items where slug = 'alpha-renamed'$q$, 'ok:1');
select t.eq('an automatic redirect was created from the old URL', 'anon', null, $q$select target from public.redirects where source_path = '/work/alpha'$q$, '/work/alpha-renamed');

-- unpublish / archive
select t.expect('editor unpublishes', 'authenticated', :'E', $q$select public.cms_unpublish(id) from public.content_items where slug = 'alpha-renamed'$q$, 'ok:1');
select t.eq('unpublished content leaves the public table', 'anon', null, $q$select count(*) from public.content_published where slug = 'alpha-renamed'$q$, '0');
select t.expect('editor archives', 'authenticated', :'E', $q$select public.cms_archive(id) from public.content_items where slug = 'alpha-renamed'$q$, 'ok:1');
select t.expect('archived content cannot be published', 'authenticated', :'E', $q$select public.cms_publish(id) from public.content_items where slug = 'alpha-renamed'$q$, 'err:P0001');
select t.expect('editor restores from archive', 'authenticated', :'E', $q$select public.cms_restore(id) from public.content_items where slug = 'alpha-renamed'$q$, 'ok:1');
select t.expect('editor cannot hard-delete content', 'authenticated', :'E', $q$delete from public.content_items where slug = 'alpha-renamed'$q$, 'ok:0');
select t.expect('administrator can hard-delete content', 'authenticated', :'A', $q$delete from public.content_items where slug = 'alpha-renamed'$q$, 'ok:1');

-- publish-time validation
select t.expect('testimonial without permission cannot publish', 'authenticated', :'E', $q$with i as (insert into public.content_items (type, slug, title, draft) values ('testimonial', 't1', 'T1', '{"quote":"A genuinely long quote here.","speaker_name":"N","speaker_role":"R","organisation":"O"}') returning id) select public.cms_publish(id) from i$q$, 'err:P0001');
select t.expect('sample testimonial cannot publish even with permission', 'authenticated', :'E', $q$with i as (insert into public.content_items (type, slug, title, draft) values ('testimonial', 't2', 'T2', '{"quote":"A genuinely long quote here.","speaker_name":"N","speaker_role":"R","organisation":"O","_permission_confirmed":true,"_sample":true}') returning id) select public.cms_publish(id) from i$q$, 'err:P0001');
select t.expect('approved real testimonial publishes', 'authenticated', :'E', $q$with i as (insert into public.content_items (type, slug, title, draft) values ('testimonial', 't3', 'T3', '{"quote":"A genuinely long quote here.","speaker_name":"N","speaker_role":"R","organisation":"O","_permission_confirmed":true}') returning id) select public.cms_publish(id) from i$q$, 'ok:1');
select t.eq('permission flag is not exposed publicly', 'anon', null, $q$select (data ? '_permission_confirmed')::text from public.content_published where slug = 't3'$q$, 'false');
select t.expect('direct client needs approval', 'authenticated', :'E', $q$with i as (insert into public.content_items (type, slug, title, draft) values ('client', 'c1', 'C1', '{"relationship":"direct","attribution":"Delivered directly for C1"}') returning id) select public.cms_publish(id) from i$q$, 'err:P0001');
select t.expect('approved direct client publishes', 'authenticated', :'E', $q$with i as (insert into public.content_items (type, slug, title, draft) values ('client', 'c2', 'C2', '{"relationship":"direct","attribution":"Delivered directly for C2","_relationship_approved":true}') returning id) select public.cms_publish(id) from i$q$, 'ok:1');
select t.expect('unconfirmed client (name only) publishes', 'authenticated', :'E', $q$with i as (insert into public.content_items (type, slug, title, draft) values ('client', 'c3', 'C3', '{"relationship":"unconfirmed"}') returning id) select public.cms_publish(id) from i$q$, 'ok:1');
select t.expect('person needs role and department', 'authenticated', :'E', $q$with i as (insert into public.content_items (type, slug, title, draft) values ('person', 'p0', 'P0', '{}') returning id) select public.cms_publish(id) from i$q$, 'err:P0001');
select t.expect('person with unapproved leadership message publishes', 'authenticated', :'E', $q$with i as (insert into public.content_items (type, slug, title, draft) values ('person', 'p1', 'P1', '{"role":"CEO","department":"Leadership","message":"Draft words from the CEO"}') returning id) select public.cms_publish(id) from i$q$, 'ok:1');
select t.eq('unapproved leadership message is NOT public', 'anon', null, $q$select (data ? 'message')::text from public.content_published where slug = 'p1'$q$, 'false');
select t.expect('approve the message and republish', 'authenticated', :'E', $q$with u as (update public.content_items set draft = draft || '{"_message_approved":true}' where slug = 'p1' returning id) select public.cms_publish(id) from u$q$, 'ok:1');
select t.eq('approved message is public', 'anon', null, $q$select data ->> 'message' from public.content_published where slug = 'p1'$q$, 'Draft words from the CEO');
select t.expect('region with a bad email cannot publish', 'authenticated', :'E', $q$with i as (insert into public.content_items (type, slug, title, draft) values ('region', 'r1', 'R1', '{"email":"not-an-email"}') returning id) select public.cms_publish(id) from i$q$, 'err:P0001');

-- ============ redirects
select t.expect('staff add an internal redirect', 'authenticated', :'E', $q$insert into public.redirects (source_path, target) values ('/old-a', '/new-a')$q$, 'ok:1');
select t.expect('self redirect rejected', 'authenticated', :'E', $q$insert into public.redirects (source_path, target) values ('/loop', '/loop')$q$, 'err:P0001');
select t.expect('redirect loop rejected', 'authenticated', :'E', $q$insert into public.redirects (source_path, target) values ('/new-a', '/old-a')$q$, 'err:P0001');
select t.expect('external redirect rejected until the host is allowed', 'authenticated', :'E', $q$insert into public.redirects (source_path, target) values ('/ext', 'https://evil.example/phish')$q$, 'err:P0001');
select t.expect('javascript: target rejected by constraint', 'authenticated', :'E', $q$insert into public.redirects (source_path, target) values ('/js', 'javascript:alert(1)')$q$, 'err:%');
select t.expect('redirects cannot shadow /admin', 'authenticated', :'E', $q$insert into public.redirects (source_path, target) values ('/admin/x', '/')$q$, 'err:23514');
select t.expect('anon cannot write redirects', 'anon', null, $q$insert into public.redirects (source_path, target) values ('/z', '/')$q$, 'err:42501');
select t.expect('allow a host in site settings', 'authenticated', :'A', $q$with i as (insert into public.content_items (type, slug, title, draft) values ('setting', 'site', 'Site', '{"redirect_hosts":["enginious.ae"]}') returning id) select public.cms_publish(id) from i$q$, 'ok:1');
select t.expect('allowed external host now accepted', 'authenticated', :'E', $q$insert into public.redirects (source_path, target) values ('/ext2', 'https://enginious.ae/page')$q$, 'ok:1');
select t.expect('protocol-relative //host target rejected', 'authenticated', :'E', $q$insert into public.redirects (source_path, target) values ('/pr1', '//evil.example/login')$q$, 'err:%');
select t.expect('userinfo trick https://allowed@evil rejected', 'authenticated', :'E', $q$insert into public.redirects (source_path, target) values ('/pr2', 'https://enginious.ae:x@evil.example/')$q$, 'err:%');
select t.expect('backslash trick rejected', 'authenticated', :'E', $q$insert into public.redirects (source_path, target) values ('/pr3', 'https://enginious.ae\@evil.example/')$q$, 'err:%');
select t.expect('http (non-TLS) external target rejected', 'authenticated', :'E', $q$insert into public.redirects (source_path, target) values ('/ext3', 'http://enginious.ae/page')$q$, 'err:23514');

-- ============ anon column-level reads and the audit log
select t.expect('anon cannot read redirect notes or authorship', 'anon', null, 'select note from public.redirects', 'err:42501');
select t.expect('anon can read the public redirect columns', 'anon', null, 'select source_path, target, status_code from public.redirects', 'ok:%');
select t.expect('anon cannot read media authorship or private paths', 'anon', null, 'select created_by, original_path from public.media_assets', 'err:42501');
select t.expect('outsider cannot write the audit log', 'authenticated', :'O', $q$select public.cms_audit_log('user.remove', 'admin@test.local', '{}')$q$, 'err:42501');
select t.expect('anon cannot write the audit log', 'anon', null, $q$select public.cms_audit_log('user.remove', 'x', '{}')$q$, 'err:42501');
select t.expect('staff cannot forge an unknown audit action', 'authenticated', :'E', $q$select public.cms_audit_log('root.takeover', 'x', '{}')$q$, 'err:P0001');
select t.expect('staff cannot flood the audit log with huge detail', 'authenticated', :'E', $q$select public.cms_audit_log('content.delete', 'x', jsonb_build_object('a', repeat('x', 5000)))$q$, 'err:P0001');
select t.expect('staff can write a valid audit entry', 'authenticated', :'E', $q$select public.cms_audit_log('content.delete', 'x', '{}')$q$, 'ok:%');

-- ============ enquiries: private, server-written
select t.expect('anon cannot read enquiries', 'anon', null, 'select * from public.enquiries', 'err:42501');
select t.expect('anon cannot insert enquiries', 'anon', null, $q$insert into public.enquiries (reference, submission_id, region, name, email, message) values ('ENQ-AAAAAAAA', gen_random_uuid(), 'uae', 'N', 'n@x.co', 'Hello there friend')$q$, 'err:42501');
select t.expect('outsider cannot insert enquiries', 'authenticated', :'O', $q$insert into public.enquiries (reference, submission_id, region, name, email, message) values ('ENQ-AAAAAAAB', gen_random_uuid(), 'uae', 'N', 'n@x.co', 'Hello there friend')$q$, 'err:42501');
select t.expect('server (service role) stores an enquiry', 'service_role', null, $q$insert into public.enquiries (reference, submission_id, region, name, email, message, technologies) values ('ENQ-TESTAAAA', gen_random_uuid(), 'ksa', 'Visitor', 'v@client.co', 'We want an interactive floor.', '{tri-helix}')$q$, 'ok:1');
select t.eq('outsider sees no enquiries', 'authenticated', :'O', 'select count(*) from public.enquiries', '0');
select t.eq('editor sees the enquiry', 'authenticated', :'E', 'select count(*) from public.enquiries', '1');
select t.expect('editor can triage', 'authenticated', :'E', $q$update public.enquiries set status = 'in_progress'$q$, 'ok:1');
select t.expect('editor cannot edit the message', 'authenticated', :'E', $q$update public.enquiries set message = 'tampered'$q$, 'err:42501');
select t.expect('editor cannot edit notification fields', 'authenticated', :'E', $q$update public.enquiries set notification_status = 'sent'$q$, 'err:42501');
select t.expect('editor cannot delete enquiries', 'authenticated', :'E', 'delete from public.enquiries', 'ok:0');
select t.expect('editor can add an internal note', 'authenticated', :'E', format($q$insert into public.enquiry_notes (enquiry_id, author, body) select id, %L, 'Called the client' from public.enquiries$q$, :'E'), 'ok:1');
select t.expect('editor cannot forge another author on a note', 'authenticated', :'E', format($q$insert into public.enquiry_notes (enquiry_id, author, body) select id, %L, 'forged' from public.enquiries$q$, :'A'), 'err:42501');
select t.expect('anon cannot read notes', 'anon', null, 'select * from public.enquiry_notes', 'err:42501');
select t.eq('outsider cannot see notes', 'authenticated', :'O', 'select count(*) from public.enquiry_notes', '0');
select t.expect('anon cannot read attachment records', 'anon', null, 'select * from public.enquiry_attachments', 'err:42501');
select t.expect('rate limit function is not callable by anon', 'anon', null, $q$select public.rate_limit_hit('k', 3, 60)$q$, 'err:42501');
select t.expect('rate limit function is not callable by editors', 'authenticated', :'E', $q$select public.rate_limit_hit('k', 3, 60)$q$, 'err:42501');
select t.eq('rate limit allows the first 3 hits', 'service_role', null, $q$select (public.rate_limit_hit('ipX', 3, 3600) and public.rate_limit_hit('ipX', 3, 3600) and public.rate_limit_hit('ipX', 3, 3600))::text$q$, 'true');
select t.eq('rate limit blocks the 4th', 'service_role', null, $q$select public.rate_limit_hit('ipX', 3, 3600)::text$q$, 'false');
select t.expect('editor cannot purge enquiries', 'authenticated', :'E', $q$select public.cms_purge_enquiries(30)$q$, 'err:42501');
select t.expect('purge needs at least 30 days', 'authenticated', :'A', $q$select public.cms_purge_enquiries(1)$q$, 'err:P0001');
select t.eq('purge keeps recent enquiries', 'authenticated', :'A', $q$select (public.cms_purge_enquiries(30) ->> 'deleted')$q$, '0');

-- ============ media
select t.expect('editor registers media', 'authenticated', :'E', $q$insert into public.media_assets (id, kind, status, published, storage_path, width, height, alt, visibility) values ('img-one', 'scene', 'concept', true, 'images/img-one/img', 1600, 900, 'Alt text', 'public')$q$, 'ok:1');
select t.expect('editor registers a private media item', 'authenticated', :'E', $q$insert into public.media_assets (id, kind, status, published, storage_path, width, height, alt, visibility) values ('img-private', 'scene', 'real', true, 'p/img-private', 1600, 900, 'Alt', 'private')$q$, 'ok:1');
select t.eq('public sees published public media only', 'anon', null, 'select count(*) from public.media_assets', '1');
select t.expect('editor cannot delete media directly', 'authenticated', :'E', 'delete from public.media_assets', 'err:42501');
select t.expect('outsider cannot register media', 'authenticated', :'O', $q$insert into public.media_assets (id, kind, status, storage_path, alt) values ('x', 'scene', 'real', 'x', 'x')$q$, 'err:42501');
select t.expect('media referenced by content cannot be deleted', 'authenticated', :'E', $q$with u as (update public.content_items set draft = draft || '{"image":"img-one"}' where slug = 'p1' returning id) select public.cms_delete_media('img-one') from u$q$, 'err:P0001');
select t.expect('unreferenced media can be deleted', 'authenticated', :'E', $q$select public.cms_delete_media('img-private')$q$, 'ok:1');

-- ============ storage policies
select t.expect('anon cannot upload to the public media bucket', 'anon', null, $q$insert into storage.objects (bucket_id, name) values ('media', 'images/a/b.webp')$q$, 'err:42501');
select t.expect('outsider cannot upload to the media bucket', 'authenticated', :'O', $q$insert into storage.objects (bucket_id, name) values ('media', 'images/a/b.webp')$q$, 'err:42501');
select t.expect('editor can upload to the media bucket', 'authenticated', :'E', $q$insert into storage.objects (bucket_id, name) values ('media', 'images/a/b.webp')$q$, 'ok:1');
select t.expect('editor can upload to the private bucket', 'authenticated', :'E', $q$insert into storage.objects (bucket_id, name) values ('private', 'orig/a.jpg')$q$, 'ok:1');
select t.eq('anon cannot list private files', 'anon', null, $q$select count(*) from storage.objects where bucket_id = 'private'$q$, '0');
select t.expect('editor cannot write enquiry attachments (server only)', 'authenticated', :'E', $q$insert into storage.objects (bucket_id, name) values ('enquiry-attachments', 'e/a.pdf')$q$, 'err:42501');
select t.expect('server writes an enquiry attachment', 'service_role', null, $q$insert into storage.objects (bucket_id, name) values ('enquiry-attachments', 'e/a.pdf')$q$, 'ok:1');
select t.eq('editor can read enquiry attachments', 'authenticated', :'E', $q$select count(*) from storage.objects where bucket_id = 'enquiry-attachments'$q$, '1');
select t.eq('outsider cannot read enquiry attachments', 'authenticated', :'O', $q$select count(*) from storage.objects where bucket_id = 'enquiry-attachments'$q$, '0');
select t.eq('anon cannot read enquiry attachments', 'anon', null, $q$select count(*) from storage.objects where bucket_id = 'enquiry-attachments'$q$, '0');
select t.expect('editor cannot delete enquiry attachments', 'authenticated', :'E', $q$delete from storage.objects where bucket_id = 'enquiry-attachments'$q$, 'ok:0');

-- ============ report
select case when ok then 'PASS' else 'FAIL' end as result, name, case when ok then '' else 'got ' || got end as detail from t.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from t.results;
