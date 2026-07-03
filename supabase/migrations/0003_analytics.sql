-- 0003_analytics.sql
-- (A) First-party product analytics  +  (B) owner-only aggregate market-insight views.
--
-- Privacy design (important):
--   • analytics_events stores ONLY non-sensitive product events (screen / feature
--     usage). No codes, CVV, images, notes, or card contents are ever written here.
--   • A user may INSERT their own events but CANNOT read anyone's events.
--   • The aggregate views are for the OWNER only — query them from the SQL Editor
--     (service role). They apply a minimum group size (k = 5 users) so small groups
--     can't be de-anonymized, are marked security_invoker (RLS applies to callers),
--     and SELECT is revoked from anon/authenticated. Only the service role sees the
--     global aggregates.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste → Run. Idempotent.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Event log
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.analytics_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  event      text not null,
  props      jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

-- Users may record their own events; there is NO select policy, so a normal user
-- can't read events (only the service role can, bypassing RLS).
drop policy if exists "events_insert_own" on public.analytics_events;
create policy "events_insert_own" on public.analytics_events
  for insert with check (auth.uid() = user_id);

create index if not exists idx_events_created_at on public.analytics_events (created_at);
create index if not exists idx_events_event      on public.analytics_events (event);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Aggregate market-insight views (owner-only; k-anonymity threshold = 5 users)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.agg_provider_distribution
  with (security_invoker = on) as
  select provider,
         count(*)                                  as num_cards,
         count(distinct user_id)                   as num_users,
         round(avg(remaining_amount)::numeric, 2)  as avg_remaining,
         round(sum(remaining_amount)::numeric, 2)  as total_remaining
    from public.cards
   group by provider
  having count(distinct user_id) >= 5;

create or replace view public.agg_spend_by_category
  with (security_invoker = on) as
  select purpose                                   as category,
         count(*)                                  as num_tx,
         count(distinct user_id)                   as num_users,
         round(sum(amount)::numeric, 2)            as total_amount
    from public.transactions
   group by purpose
  having count(distinct user_id) >= 5;

create or replace view public.agg_spend_by_store
  with (security_invoker = on) as
  select store,
         count(*)                                  as num_tx,
         count(distinct user_id)                   as num_users,
         round(sum(amount)::numeric, 2)            as total_amount
    from public.transactions
   where coalesce(trim(store), '') <> ''
   group by store
  having count(distinct user_id) >= 5;

create or replace view public.agg_overview
  with (security_invoker = on) as
  select count(distinct user_id)                                                as users_with_cards,
         count(*) filter (where not fully_used)                                 as active_cards,
         round(sum(remaining_amount) filter (where not fully_used)::numeric, 2) as total_unused_value
    from public.cards;

create or replace view public.agg_events_daily
  with (security_invoker = on) as
  select date_trunc('day', created_at)::date as "day",
         event,
         count(*)                            as events,
         count(distinct user_id)             as users
    from public.analytics_events
   group by 1, 2;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Lock the aggregate views to the owner (service role) only.
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on public.agg_provider_distribution from anon, authenticated;
revoke all on public.agg_spend_by_category     from anon, authenticated;
revoke all on public.agg_spend_by_store        from anon, authenticated;
revoke all on public.agg_overview              from anon, authenticated;
revoke all on public.agg_events_daily          from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Example owner queries (run in the SQL Editor):
--   select * from public.agg_overview;
--   select * from public.agg_provider_distribution order by num_users desc;
--   select * from public.agg_spend_by_category     order by total_amount desc;
--   select * from public.agg_spend_by_store        order by total_amount desc limit 20;
--   select * from public.agg_events_daily          order by day desc, events desc;
-- ─────────────────────────────────────────────────────────────────────────────
