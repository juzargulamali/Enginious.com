-- BOOTSTRAP THE FIRST ADMINISTRATOR (run once, by the owner, in the Supabase SQL editor of the ENGINIOUS project).
--
-- There is deliberately no default password and nobody is made an administrator automatically. The first administrator is
-- chosen by you, in the dashboard, with these two steps:
--
--  1. Supabase dashboard -> Authentication -> Users -> "Add user" -> "Create new user".
--     Enter the owner's email and a long unique password. Tick "Auto Confirm User". (Or use "Invite user" and set the password
--     from the email link. Do NOT enable public sign-ups: see docs/cms-setup.md.)
--  2. Run the statement below with that email.
--
-- Everyone after the first administrator is invited from /admin -> Users and access.

insert into public.cms_roles (user_id, role, email)
select id, 'administrator', email
  from auth.users
 where lower(email) = lower('OWNER-EMAIL@example.com')   -- <- replace with the owner's email
on conflict (user_id) do update set role = 'administrator', disabled = false;

-- Check: this must return exactly one row with role = administrator.
select u.email, r.role, r.disabled from public.cms_roles r join auth.users u on u.id = r.user_id;
