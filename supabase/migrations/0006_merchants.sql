-- 0006_merchants.sql
-- "Which of my cards works at this store?" — a merchant ↔ provider map.
--
-- IMPORTANT, read before trusting this data:
--   Every provider states their list of accepting businesses "may change at any
--   time without prior notice". This table is therefore a CONVENIENCE COPY, not
--   the source of truth. The app always links to the provider's official list
--   (PROVIDERS[].listUrl) and labels results "verify at the register".
--
-- Seeded from official sources (July 2026):
--   • Dream Card VIP — https://online.dreamcard.co.il/public/branches
--   • Max Gift       — https://onlinelcapi.max.co.il/SharedMedia/10496/gcreshatot.pdf
--   • BuyMe ALL      — NOT seeded: their catalogue is JS-rendered and very large;
--                      the app links to https://buyme.co.il/brands/13438757 instead.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → paste → Run. Idempotent.

create table if not exists public.merchants (
  id         bigint generated always as identity primary key,
  provider   text not null,          -- matches PROVIDERS[].id in the app
  name       text not null,          -- chain / business name as shoppers know it
  variant    text,                   -- e.g. 'Dream Card VIP' (some providers have several card types)
  source_url text,
  updated_at timestamptz not null default now(),
  unique (provider, name)
);

create index if not exists idx_merchants_name on public.merchants (name);

alter table public.merchants enable row level security;

-- Any signed-in user may read the map; only admins may change it.
drop policy if exists "merchants_read" on public.merchants;
create policy "merchants_read" on public.merchants
  for select using (auth.uid() is not null);

drop policy if exists "merchants_admin_all" on public.merchants;
create policy "merchants_admin_all" on public.merchants
  for all using (public.is_admin()) with check (public.is_admin());

-- ─── Dream Card VIP (~830 branches across these chains) ──────────────────────
insert into public.merchants (provider, name, variant, source_url) values
  ('dreamcard','FOX','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','FOX HOME','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','AMERICAN EAGLE','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','AERIE','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','YANGA','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','MANGO','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','THE CHILDREN''S PLACE','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','RUBY BAY','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','FOOT LOCKER','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','BILLABONG','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','FLYING TIGER','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','SUNGLASS HUT','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','QUIKSILVER','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','BOARDRIDERS','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','LALINE','Dream Card VIP','https://online.dreamcard.co.il/public/branches'),
  ('dreamcard','TERMINAL X','Dream Card VIP','https://online.dreamcard.co.il/public/branches')
on conflict (provider, name) do nothing;

-- ─── Max Gift ────────────────────────────────────────────────────────────────
insert into public.merchants (provider, name, variant, source_url) values
  ('max','FOX','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','FOX HOME','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','AMERICAN EAGLE','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','AERIE','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','THE CHILDREN''S PLACE','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','GOLF','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','GOLF & CO','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','GOLF KIDS & BABY','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','INTIMA','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','POLGAT','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','TNT','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','ASICS','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','BIRKENSTOCK','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','SAUCONY','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','עמנואל','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','DREAM SPORT','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','FOOT LOCKER','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','TERMINAL X','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','KEDS','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','המשביר לצרכן','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','DELTA','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','כיתן','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','H&O','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','ICE CUBE','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','FACTORY 54','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','MICHAEL KORS','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','HUGO BOSS','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','ARMANI EXCHANGE','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','FRED PERRY','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','LEVIS','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','CALVIN KLEIN','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','PAUL & SHARK','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','TOMMY HILFIGER','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','JUICY COUTURE','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','PUMA','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','PETIT BATEAU','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','LACOSTE','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','DIESEL','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','סטימצקי','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','גוד נייט','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','עמינח','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','SABON','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','TOUS','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','SUPERDRY','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','LONGCHAMP','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','DESIGUAL','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','ADIDAS','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','REPLAY','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','STEVE MADDEN','Max Gift','https://www.max.co.il/cards/giftcards'),
  ('max','שקם אלקטריק','Max Gift','https://www.max.co.il/cards/giftcards')
on conflict (provider, name) do nothing;

-- Count what's loaded:  select provider, count(*) from public.merchants group by provider;
