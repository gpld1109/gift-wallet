-- 0009_ping.sql
-- A tiny public health endpoint for the keep-alive workflow to call daily, so the
-- free-tier project never goes 7 days without a request and gets paused.
-- Returns only the current time — no data, safe for anon to call.
--
-- HOW TO RUN: Supabase → SQL Editor → paste → Run. Idempotent.

create or replace function public.ping()
returns timestamptz
language sql
stable
as $$ select now(); $$;

revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
