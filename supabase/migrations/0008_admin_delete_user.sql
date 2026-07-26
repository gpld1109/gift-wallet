-- 0008_admin_delete_user.sql
-- Admin: permanently delete a user and everything belonging to them.
--
-- We delete every child row EXPLICITLY (not relying on ON DELETE CASCADE, which
-- may or may not exist on the older cards/transactions tables), then remove the
-- auth.users row last. This leaves no orphaned data and works regardless of how
-- the foreign keys were originally set up.
--
-- This is IRREVERSIBLE. The function re-checks is_admin() server-side and refuses
-- to delete an admin or yourself, so a stray call can't wipe an admin.
--
-- HOW TO RUN: Supabase → SQL Editor → paste → Run. Idempotent.

create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if target = auth.uid() then raise exception 'cannot delete yourself'; end if;
  if public.is_admin(target) then raise exception 'cannot delete an admin'; end if;

  delete from public.transactions     where user_id = target;
  delete from public.cards            where user_id = target;
  delete from public.user_keys        where user_id = target;
  delete from public.analytics_events where user_id = target;
  delete from public.profiles         where user_id = target;
  delete from auth.users              where id      = target;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
