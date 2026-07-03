-- 0002_premium_plan.sql
-- Gift Wallet — Free/Premium plan gating.
--   • Free  = up to 2 cards.
--   • Premium = unlimited cards (+ future premium features).
--
-- The limit is enforced in the DATABASE (a BEFORE INSERT trigger), not only in
-- the client, so it cannot be bypassed by editing the public JS or calling the
-- API directly. The plan lives in `profiles` and can be changed ONLY by the
-- service role (a payment webhook or an admin SQL statement) — there is no user
-- UPDATE policy, so a user can never upgrade themselves for free.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run more than once (idempotent).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. profiles — one row per user, holds their plan.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  plan          text not null default 'free' check (plan in ('free', 'premium')),
  premium_until timestamptz,                 -- optional expiry for a paid subscription
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users may READ their own plan. There is deliberately NO insert/update policy
-- for users, so the plan can only be set by the service role.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Enforce the Free card limit at insert time.
--    SECURITY DEFINER so it can read `profiles`/`cards` regardless of RLS.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_free_card_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_premium boolean;
  card_count integer;
begin
  select (p.plan = 'premium'
          or (p.premium_until is not null and p.premium_until > now()))
    into is_premium
    from public.profiles p
   where p.user_id = new.user_id;

  if coalesce(is_premium, false) then
    return new;                         -- Premium: no limit
  end if;

  select count(*) into card_count
    from public.cards
   where user_id = new.user_id;

  if card_count >= 2 then
    raise exception 'FREE_CARD_LIMIT: the free plan is limited to 2 cards'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_free_card_limit on public.cards;
create trigger trg_enforce_free_card_limit
  before insert on public.cards
  for each row execute function public.enforce_free_card_limit();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Grant YOURSELF Premium, so your own real cards are never blocked.
--    ⚠️ Replace the email below with the email you sign in to the app with,
--    then run just this statement.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.profiles (user_id, plan)
select id, 'premium' from auth.users where email = 'guy@c2k.co.il'
on conflict (user_id) do update set plan = 'premium', updated_at = now();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Verify (optional):
--   select u.email, coalesce(p.plan, 'free') as plan, p.premium_until
--     from auth.users u
--     left join public.profiles p on p.user_id = u.id
--    order by u.email;
-- ─────────────────────────────────────────────────────────────────────────────
