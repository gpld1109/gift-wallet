-- 0005_admin.sql
-- Admin console: list users, flip Free/Premium, block a problem account.
--
-- Security model:
--   • Admin power is enforced in the DATABASE, not by hiding a button. Every
--     admin action is a SECURITY DEFINER function that re-checks is_admin()
--     server-side, so a non-admin calling the API directly gets nothing.
--   • Admins still CANNOT read anyone's card codes — those are encrypted with
--     each user's own passphrase (zero-knowledge). That is by design.
--   • A blocked user loses access to their rows via RLS, not just in the UI.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste → Run. Idempotent.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Flags
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists blocked  boolean not null default false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Helpers. SECURITY DEFINER so they don't recurse through profiles' own RLS.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select p.is_admin from public.profiles p where p.user_id = uid), false);
$$;

create or replace function public.is_blocked(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select p.blocked from public.profiles p where p.user_id = uid), false);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Blocking has teeth: a blocked account can't touch its rows at all.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "cards_select_own" on public.cards;
create policy "cards_select_own" on public.cards for select
  using (auth.uid() = user_id and not public.is_blocked());
drop policy if exists "cards_insert_own" on public.cards;
create policy "cards_insert_own" on public.cards for insert
  with check (auth.uid() = user_id and not public.is_blocked());
drop policy if exists "cards_update_own" on public.cards;
create policy "cards_update_own" on public.cards for update
  using (auth.uid() = user_id and not public.is_blocked())
  with check (auth.uid() = user_id and not public.is_blocked());

drop policy if exists "tx_select_own" on public.transactions;
create policy "tx_select_own" on public.transactions for select
  using (auth.uid() = user_id and not public.is_blocked());
drop policy if exists "tx_insert_own" on public.transactions;
create policy "tx_insert_own" on public.transactions for insert
  with check (auth.uid() = user_id and not public.is_blocked());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Admin: list users. Emails live in auth.users, which the client cannot read,
--    so this function is the only door — and it returns rows to admins only.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_list_users()
returns table (
  user_id uuid, email text, plan text, blocked boolean, is_admin boolean,
  early_adopter boolean, created_at timestamptz, cards integer
)
language sql stable security definer set search_path = public, pg_temp as $$
  select u.id,
         u.email::text,
         coalesce(p.plan, 'free'),
         coalesce(p.blocked, false),
         coalesce(p.is_admin, false),
         coalesce(p.early_adopter, false),
         u.created_at,
         (select count(*)::int from public.cards c where c.user_id = u.id)
    from auth.users u
    left join public.profiles p on p.user_id = u.id
   where public.is_admin()
   order by u.created_at desc;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Admin actions. Each re-checks is_admin() itself.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_set_plan(target uuid, new_plan text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if new_plan not in ('free', 'premium') then raise exception 'invalid plan'; end if;
  insert into public.profiles (user_id, plan) values (target, new_plan)
  on conflict (user_id) do update set plan = new_plan, updated_at = now();
end; $$;

create or replace function public.admin_set_blocked(target uuid, block boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  -- never lock out a fellow admin by accident
  if block and public.is_admin(target) then raise exception 'cannot block an admin'; end if;
  insert into public.profiles (user_id, blocked) values (target, block)
  on conflict (user_id) do update set blocked = block, updated_at = now();
end; $$;

-- Only signed-in users may even call these; the functions themselves then
-- enforce that the caller is an admin.
revoke all on function public.admin_list_users()               from public, anon;
revoke all on function public.admin_set_plan(uuid, text)       from public, anon;
revoke all on function public.admin_set_blocked(uuid, boolean) from public, anon;
grant execute on function public.admin_list_users()               to authenticated;
grant execute on function public.admin_set_plan(uuid, text)       to authenticated;
grant execute on function public.admin_set_blocked(uuid, boolean) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Make yourself the admin.
--    ⚠️ Replace the email with the one you sign in to the app with.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.profiles (user_id, plan, is_admin)
select id, 'premium', true from auth.users where email = 'guy@c2k.co.il'
on conflict (user_id) do update set is_admin = true, plan = 'premium', updated_at = now();

-- Verify:  select email, is_admin, plan from public.admin_list_users() limit 20;
