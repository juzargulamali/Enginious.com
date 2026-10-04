-- Milestone 2 / 5: small public helper.
-- Which content types have been brought under CMS control? The public site uses this to decide, per type, whether the CMS is
-- authoritative (even when everything of that type is unpublished) or the built-in starter content still applies.
-- It reveals only type names, never counts, slugs or content.
create or replace function public.cms_type_initialised()
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct type), '{}') from public.content_items
$$;
revoke all on function public.cms_type_initialised() from public;
grant execute on function public.cms_type_initialised() to anon, authenticated;

-- Ordering and featured status are part of the live snapshot. This applies the current order/featured settings of every
-- already-published item of a type to the live site WITHOUT publishing anything else (draft text edits stay unpublished).
create or replace function public.cms_apply_order(p_type text)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  perform public.cms_assert_staff();
  with u as (
    update public.content_published p set sort_order = i.sort_order, featured = i.featured
      from public.content_items i
     where i.id = p.item_id and i.type = p_type and (p.sort_order is distinct from i.sort_order or p.featured is distinct from i.featured)
    returning 1)
  select count(*) into n from u;
  return n;
end $$;
revoke all on function public.cms_apply_order(text) from public, anon;
grant execute on function public.cms_apply_order(text) to authenticated;
