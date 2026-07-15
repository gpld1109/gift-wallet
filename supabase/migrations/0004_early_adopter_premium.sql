-- 0004_early_adopter_premium.sql
-- Auto-grant Premium to the first 10 NEW sign-ups (early adopters).
--
-- How it works: a trigger on auth.users fires for every new sign-up. As long as
-- fewer than 10 "early adopter" grants exist, the new user's profile is created
-- with plan = 'premium'. Beyond 10, new users stay on the free plan.
--
-- The `early_adopter` flag keeps this count separate from manual grants (e.g. the
-- owner's own Premium), so a manual grant never consumes one of the 10 slots.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste → Run. Idempotent.

-- 1. Mark which premium grants are the automatic early-adopter ones.
alter table public.profiles
  add column if not exists early_adopter boolean not null default false;

-- 2. On each new sign-up, grant Premium while slots remain.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  granted integer;
begin
  select count(*) into granted from public.profiles where early_adopter = true;

  if granted < 10 then
    insert into public.profiles (user_id, plan, early_adopter)
    values (new.id, 'premium', true)
    on conflict (user_id) do update
      set plan = 'premium', early_adopter = true, updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. See who got an early-adopter Premium and how many slots are left:
--   select u.email, p.plan, p.created_at
--     from public.profiles p
--     join auth.users u on u.id = p.user_id
--    where p.early_adopter = true
--    order by p.created_at;
--   -- slots left = 10 - (number of rows above)
