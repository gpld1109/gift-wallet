-- 0001_security_rls.sql
-- Gift Wallet — enable Row Level Security on all tables and add the user_keys
-- table that stores the envelope-encryption key material (per user).
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste this → Run.
-- It is safe to run more than once (idempotent).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. user_keys — holds the *wrapped* Data Encryption Key for each user.
--    No plaintext secret is ever stored here: wrapped_dek / recovery_wrapped_dek
--    are the DEK encrypted with a key derived from the user's passphrase (or
--    recovery code), which never leaves the device.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_keys (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  salt                 text    not null,
  iterations           integer not null default 310000,
  wrapped_dek          text    not null,
  recovery_salt        text    not null,
  recovery_wrapped_dek text    not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Enable RLS on every table. Without this, the public anon key can read
--    every user's rows.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.cards        enable row level security;
alter table public.transactions enable row level security;
alter table public.user_keys    enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Policies — each user may only touch their own rows (auth.uid() = user_id).
-- ─────────────────────────────────────────────────────────────────────────────
-- cards
drop policy if exists "cards_select_own" on public.cards;
create policy "cards_select_own" on public.cards for select using (auth.uid() = user_id);
drop policy if exists "cards_insert_own" on public.cards;
create policy "cards_insert_own" on public.cards for insert with check (auth.uid() = user_id);
drop policy if exists "cards_update_own" on public.cards;
create policy "cards_update_own" on public.cards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "cards_delete_own" on public.cards;
create policy "cards_delete_own" on public.cards for delete using (auth.uid() = user_id);

-- transactions
drop policy if exists "tx_select_own" on public.transactions;
create policy "tx_select_own" on public.transactions for select using (auth.uid() = user_id);
drop policy if exists "tx_insert_own" on public.transactions;
create policy "tx_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
drop policy if exists "tx_update_own" on public.transactions;
create policy "tx_update_own" on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "tx_delete_own" on public.transactions;
create policy "tx_delete_own" on public.transactions for delete using (auth.uid() = user_id);

-- user_keys
drop policy if exists "keys_select_own" on public.user_keys;
create policy "keys_select_own" on public.user_keys for select using (auth.uid() = user_id);
drop policy if exists "keys_insert_own" on public.user_keys;
create policy "keys_insert_own" on public.user_keys for insert with check (auth.uid() = user_id);
drop policy if exists "keys_update_own" on public.user_keys;
create policy "keys_update_own" on public.user_keys for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "keys_delete_own" on public.user_keys;
create policy "keys_delete_own" on public.user_keys for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Indexes on the columns used by the policies (RLS adds per-row cost).
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_cards_user_id        on public.cards (user_id);
create index if not exists idx_transactions_user_id on public.transactions (user_id);
create index if not exists idx_transactions_card_id on public.transactions (card_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Verify (optional). After running the above, this should return rowsecurity = true
--    for all three tables:
--      select tablename, rowsecurity
--        from pg_tables
--       where schemaname = 'public'
--         and tablename in ('cards','transactions','user_keys');
-- ─────────────────────────────────────────────────────────────────────────────
