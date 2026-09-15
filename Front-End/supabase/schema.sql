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

-- ── Product Catalog (PRD 17 kode) ────────────────────────────────────────
create table if not exists public.product_catalog (
  code      text primary key,
  name      text not null,
  unit      text not null default 'kg',
  category  text not null default 'lainnya'
);

-- ── Sales Items (child table, normalisasi dari sales.items jsonb) ────────
create table if not exists public.sales_items (
  id           uuid primary key default gen_random_uuid(),
  sales_id     uuid not null references public.sales (id) on delete cascade,
  product_code text not null references public.product_catalog (code),
  product_name text not null default '',
  quantity     numeric(10,2) not null check (quantity > 0),
  unit_price   numeric(14,2) not null check (unit_price > 0),
  subtotal     numeric(16,2) not null default 0,
  created_at   timestamptz not null default now(),
  unique (sales_id, product_code)
);

-- ── Trigger: subtotal otomatis + recalc total_amount ─────────────────────
create or replace function public.fnc_sales_items_subtotal()
returns trigger language plpgsql as $$
begin
  new.subtotal := round(coalesce(new.quantity,0) * coalesce(new.unit_price,0), 2);
  return new;
end $$;

drop trigger if exists trg_sales_items_subtotal on public.sales_items;
create trigger trg_sales_items_subtotal
  before insert or update on public.sales_items
  for each row execute function public.fnc_sales_items_subtotal();

create or replace function public.fnc_sales_recalc_total(p_sales_id uuid)
returns void language plpgsql as $$
begin
  update public.sales s set total_amount = coalesce((
    select sum(subtotal) from public.sales_items where sales_id = p_sales_id
  ), 0) where s.id = p_sales_id;
end $$;

create or replace function public.fnc_sales_recalc_trigger()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.fnc_sales_recalc_total(old.sales_id);
  else
    perform public.fnc_sales_recalc_total(new.sales_id);
  end if;
  return null;
end $$;

drop trigger if exists trg_sales_items_recalc on public.sales_items;
create trigger trg_sales_items_recalc
  after insert or update or delete on public.sales_items
  for each row execute function public.fnc_sales_recalc_trigger();

-- ── Audit Log (backend service_role) ───────────────────────────────────
-- Ditulis oleh backend (service_role), TIDAK di-expose ke anon.
-- service_role bypass RLS, jadi cukup enable tanpa policy publik.
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       text not null default 'anonymous',
  method      text not null,
  path        text not null,
  entity      text not null,
  entity_id   uuid,
  action      text not null,          -- create | update | delete
  changes     jsonb not null default '{}',   -- {before, after}
  status_code smallint not null,
  ip          text,
  created_at  timestamptz not null default now()
);

-- ── RLS sales_items + product_catalog ──────────────────────────────────
alter table public.sales_items  enable row level security;
alter table public.product_catalog enable row level security;

drop policy if exists "anon read sales_items" on public.sales_items;
drop policy if exists "anon insert sales_items" on public.sales_items;
drop policy if exists "anon delete sales_items" on public.sales_items;
create policy "anon read sales_items" on public.sales_items for select using (true);
create policy "anon insert sales_items" on public.sales_items for insert with check (true);
create policy "anon delete sales_items" on public.sales_items for delete using (true);

drop policy if exists "anon read product_catalog" on public.product_catalog;
create policy "anon read product_catalog" on public.product_catalog for select using (true);

-- ── Audit Log (backend service_role) ───────────────────────────────────
-- Ditulis oleh backend (service_role), TIDAK di-expose ke anon.
-- service_role bypass RLS, jadi cukup enable tanpa policy publik.
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       text not null default 'anonymous',
  method      text not null,
  path        text not null,
  entity      text not null,
  entity_id   uuid,
  action      text not null,          -- create | update | delete
  changes     jsonb not null default '{}',   -- {before, after}
  status_code smallint not null,
  ip          text,
  created_at  timestamptz not null default now()
);

alter table public.audit_log enable row level security;