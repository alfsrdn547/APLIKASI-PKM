-- supabase/schema.sql — RPH database schema
-- Jalankan di Supabase SQL Editor (Project → SQL Editor → New query)

-- ── Modul 1: Penerimaan ────────────────────────────────────────────────
create table if not exists public.incoming (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  chicken_in    integer not null default 0,
  chicken_dead  integer not null default 0,
  chicken_broken integer not null default 0,
  notes         text not null default '',
  created_at    timestamptz not null default now()
);

-- ── Modul 3: Penjualan ────────────────────────────────────────────────
create table if not exists public.sales (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  customer_name  text not null default '',
  customer_phone text not null default '',
  items       jsonb not null default '[]',
  total_amount   numeric not null default 0,
  status      text not null default 'pending',
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

-- ── Modul 3: Pengeluaran ───────────────────────────────────────────────
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  category    text not null default 'lainnya',
  description text not null default '',
  amount      numeric not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Papan Tulis (opsional: snapshot) ───────────────────────────────────
create table if not exists public.whiteboard (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  product_code text not null,
  opening     numeric not null default 0,
  incoming    numeric not null default 0,
  outgoing    numeric not null default 0,
  closing     numeric not null default 0,
  unit_price  numeric not null default 0,
  created_at  timestamptz not null default now(),
  unique (date, product_code)
);

-- ── Modul 2: Pemotongan Manual ────────────────────────────────────────
create table if not exists public.butchery (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  incoming_id   uuid null,                 -- tautan audit ke penerimaan (optional)
  chicken_count integer not null default 0,
  parts         jsonb not null default '[]',  -- [{productCode, qtyKg}]
  notes         text not null default '',
  created_at    timestamptz not null default now()
);

alter table public.butchery enable row level security;
drop policy if exists "anon read butchery"  on public.butchery;
drop policy if exists "anon insert butchery" on public.butchery;
drop policy if exists "anon delete butchery" on public.butchery;
create policy "anon read butchery"  on public.butchery for select using (true);
create policy "anon insert butchery" on public.butchery for insert with check (true);
create policy "anon delete butchery" on public.butchery for delete using (true);

-- ── Row Level Security: izinkan semua (single-user internal tool) ─────
alter table public.incoming  enable row level security;
alter table public.sales     enable row level security;
alter table public.expenses  enable row level security;
alter table public.whiteboard enable row level security;

drop policy if exists "anon read incoming"  on public.incoming;
drop policy if exists "anon insert incoming" on public.incoming;
drop policy if exists "anon delete incoming" on public.incoming;
create policy "anon read incoming"  on public.incoming  for select using (true);
create policy "anon insert incoming" on public.incoming  for insert with check (true);
create policy "anon delete incoming" on public.incoming  for delete using (true);

drop policy if exists "anon read sales"     on public.sales;
drop policy if exists "anon insert sales"   on public.sales;
drop policy if exists "anon update sales"   on public.sales;
create policy "anon read sales"     on public.sales   for select using (true);
create policy "anon insert sales"   on public.sales   for insert with check (true);
create policy "anon update sales"   on public.sales   for update using (true);

drop policy if exists "anon read expenses"  on public.expenses;
drop policy if exists "anon insert expenses" on public.expenses;
drop policy if exists "anon delete expenses" on public.expenses;
create policy "anon read expenses"  on public.expenses for select using (true);
create policy "anon insert expenses" on public.expenses for insert with check (true);
create policy "anon delete expenses" on public.expenses for delete using (true);

drop policy if exists "anon read whiteboard"  on public.whiteboard;
drop policy if exists "anon insert whiteboard" on public.whiteboard;
create policy "anon read whiteboard"  on public.whiteboard for select using (true);
create policy "anon insert whiteboard" on public.whiteboard for insert with check (true);