-- ============================================================================
-- RPH — ALTER MIGRATION (idempotent, non-destruktif)
-- Menambah struktur PRD ke skema LIVE (Supabase) tanpa kehilangan data.
-- Bisa dijalankan berulang (aman). Beda dgn PRD_DDL.sql (project baru).
-- ============================================================================

------------------- ENUM ------------------------------------------------------
do $$ begin create type public.user_role as enum ('operator','pemilik');
exception when duplicate_object then null; end $$;
do $$ begin create type public.order_status as enum ('pending','processing','completed','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin create type public.pay_status as enum ('lunas','belum_lunas');
exception when duplicate_object then null; end $$;
do $$ begin create type public.pickup_status as enum ('sudah_diambil','belum_diambil');
exception when duplicate_object then null; end $$;
do $$ begin create type public.product_unit as enum ('kg','ekor');
exception when duplicate_object then null; end $$;
do $$ begin create type public.expense_direction as enum ('keluar','masuk');
exception when duplicate_object then null; end $$;

------------------- USERS ------------------------------------------------------
create table if not exists public.users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  full_name  text not null default '',
  role       public.user_role not null default 'operator',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

------------------- Tabel LIVE: ALTER (tambah kolom, keep existing) ----------
-- incoming (sudah ada: chicken_in/dead/broken, notes, date)
alter table public.incoming add column if not exists nopol        text not null default '';
alter table public.incoming add column if not exists total_ekor   integer not null default 0;
alter table public.incoming add column if not exists tonase_kg    numeric(12,2) not null default 0;
alter table public.incoming add column if not exists harga_per_kg numeric(14,2) not null default 0;
alter table public.incoming add column if not exists total_harga  numeric(16,2) not null default 0;
alter table public.incoming add column if not exists kasbon       numeric(16,2) not null default 0;
alter table public.incoming add column if not exists ekor_mati    integer not null default 0;

-- backfill ekor_mati dari chicken_dead & total_ekor dari chicken_in (data existing)
update public.incoming set ekor_mati = chicken_dead where ekor_mati = 0 and chicken_dead > 0;
update public.incoming set total_ekor = chicken_in  where total_ekor = 0 and chicken_in > 0;

-- sales (sudah ada: items jsonb, total_amount, status, customer_*, notes)
alter table public.sales add column if not exists customer_phone  text not null default '';
alter table public.sales add column if not exists nopol           text not null default '';
alter table public.sales add column if not exists method_payment  text not null default 'cash';
alter table public.sales add column if not exists pay_status      public.pay_status not null default 'belum_lunas';
alter table public.sales add column if not exists pickup_status   public.pickup_status not null default 'belum_diambil';
alter table public.sales add column if not exists paid_amount     numeric(16,2) not null default 0;
alter table public.sales add column if not exists kasbon          numeric(16,2) not null default 0;
alter table public.sales add column if not exists bonus_kg        numeric(10,2) not null default 0;

-- expenses (sudah ada: date, category, description, amount)
alter table public.expenses add column if not exists direction   public.expense_direction not null default 'keluar';
alter table public.expenses add column if not exists source_fund text not null default 'kas';

------------------- Tabel BARU utilitarian (belum ada) -------------------------
create table if not exists public.opening_stock (
  id           uuid primary key default gen_random_uuid(),
  date         date not null unique,
  opening_ekor integer not null default 0 check (opening_ekor >= 0),
  created_by   uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.product_catalog (
  code     text primary key,
  name     text not null,
  unit     public.product_unit not null default 'kg',
  category text not null default 'lainnya'
);

create table if not exists public.production (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  incoming_id uuid references public.incoming (id) on delete set null,
  chicken_cut integer not null default 0 check (chicken_cut > 0),
  notes       text not null default '',
  created_by  uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.production_parts (
  id            uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.production (id) on delete cascade,
  product_code  text not null references public.product_catalog (code),
  qty_kg        numeric(10,2) not null default 0 check (qty_kg >= 0),
  unique (production_id, product_code)
);

create table if not exists public.sales_items (
  id           uuid primary key default gen_random_uuid(),
  sales_id     uuid not null references public.sales (id) on delete cascade,
  product_code text not null references public.product_catalog (code),
  quantity     numeric(10,2) not null check (quantity > 0),
  unit_price   numeric(14,2) not null check (unit_price > 0),
  subtotal     numeric(16,2) not null default 0,
  product_name text not null default '',
  unique (sales_id, product_code)
);

create table if not exists public.audit_log (
  id          bigserial primary key,
  actor       text not null,
  user_id     uuid references public.users (id) on delete set null,
  method      text not null,
  path        text not null,
  entity      text not null,
  entity_id   text,
  action      text not null,
  changes     jsonb not null default '{}',
  status_code smallint not null,
  ip          text,
  created_at  timestamptz not null default now()
);
alter table public.audit_log enable row level security;

create table if not exists public.stock_ready (
  date       date primary key,
  stok_lama  bigint not null default 0,
  ekor_masuk bigint not null default 0,
  ekor_mati  bigint not null default 0,
  stok_siap  bigint not null default 0
);

------------------- SEED product_catalog (17, dari PRD) ------------------------
insert into public.product_catalog (code, name, unit, category) values
  ('PC','Ayam Utuh Parting/Potong','kg','ayam_utuh'),
  ('KRKS','Ayam Utuh Karkas','kg','ayam_utuh'),
  ('BLD','Boneless Dada','kg','daging'),
  ('BLD-K','Boneless Dada Kulit','kg','daging'),
  ('BLP','Boneless Paha','kg','daging'),
  ('BLP-K','Boneless Paha Kulit','kg','daging'),
  ('PAHA-P','Paha (P)','kg','daging'),
  ('PAHA-U','Paha (U)','kg','daging'),
  ('PAHA-A','Paha (A)','kg','daging'),
  ('SAYAP-B','Sayap (B)','kg','daging'),
  ('SAYAP-R','Sayap (R)','kg','daging'),
  ('CKR','Cakar','kg','sampingan'),
  ('KPL','Kepala','ekor','sampingan'),
  ('KULIT','Kulit','kg','sampingan'),
  ('USUS','Usus','kg','sampingan'),
  ('ATI','Ati','kg','sampingan'),
  ('TULANG','Tulang','kg','sampingan')
on conflict (code) do nothing;

------------------- TRIGGER: auto-hitung --------------------------------------
-- 1) total_harga di incoming
create or replace function public.fnc_incoming_total_harga()
returns trigger language plpgsql as $$
begin
  new.total_harga := coalesce(new.total_ekor, new.chicken_in, 0) * coalesce(new.harga_per_kg,0);
  return new;
end $$;
drop trigger if exists trg_incoming_total_harga on public.incoming;
create trigger trg_incoming_total_harga before insert or update on public.incoming
  for each row execute function public.fnc_incoming_total_harga();

-- 2) subtotal + recalc total_amount sales
create or replace function public.fnc_sales_items_subtotal()
returns trigger language plpgsql as $$
begin
  new.subtotal := round(coalesce(new.quantity,0) * coalesce(new.unit_price,0), 2);
  return new;
end $$;
drop trigger if exists trg_sales_items_subtotal on public.sales_items;
create trigger trg_sales_items_subtotal before insert or update on public.sales_items
  for each row execute function public.fnc_sales_items_subtotal();

create or replace function public.fnc_sales_recalc_total(p_sales_id uuid)
returns void language plpgsql as $$
begin
  update public.sales s set total_amount = coalesce((
    select sum(subtotal) from public.sales_items where sales_id = p_sales_id), 0)
  where s.id = p_sales_id;
end $$;

create or replace function public.fnc_sales_recalc_trigger()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then perform public.fnc_sales_recalc_total(old.sales_id);
  else perform public.fnc_sales_recalc_total(new.sales_id); end if;
  return null;
end $$;
drop trigger if exists trg_sales_items_recalc on public.sales_items;
create trigger trg_sales_items_recalc after insert or update or delete on public.sales_items
  for each row execute function public.fnc_sales_recalc_trigger();

-- 3) Stok Siap Produksi = (Stok Lama + Ekor Masuk) − Ekor mati
-- Kolom  masuk/mati = OPS AKTIF (chicken_in / chicken_dead / ekor_mati). PRD
-- pakai total_ekor; untuk skema live gunakan chicken_in (ekor masuk).
create or replace function public.stok_siap_produksi(p_date date)
returns table (date date, stok_lama bigint, ekor_masuk bigint, ekor_mati bigint, stok_siap bigint)
language sql stable as $$
  select d.date,
         coalesce(os.opening_ekor,0) as stok_lama,
         coalesce(sum(i.chicken_in),0) as ekor_masuk,
         coalesce(sum(coalesce(i.ekor_mati, i.chicken_dead)),0) as ekor_mati,
         coalesce(os.opening_ekor,0)+coalesce(sum(i.chicken_in),0)-coalesce(sum(coalesce(i.ekor_mati, i.chicken_dead)),0) as stok_siap
  from (select p_date::date as date) d
  left join public.opening_stock os on os.date = d.date
  left join public.incoming i on i.date = d.date
  group by d.date, os.opening_ekor;
$$;

-- refresh_stock_ready: SECURITY DEFINER agar trigger berjalan saat anon insert
-- (tanpa definer, RLS stock_ready memblokir insert dari trigger → error 42501).
-- Hak menulis stock_ready tetap hanya untuk pemilik tabel; anon tidak dapat
-- menulis stock_ready secara langsung.
create or replace function public.refresh_stock_ready(p_date date default current_date)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.stock_ready where date = p_date;
  insert into public.stock_ready
    select * from public.stok_siap_produksi(p_date) on conflict (date) do nothing;
end $$;

create or replace function public.refresh_stock_ready_trigger()
returns trigger language plpgsql as $$
declare v_date date;
begin
  if tg_op = 'DELETE' then
    v_date := old.date;
  else
    v_date := new.date;
  end if;
  perform public.refresh_stock_ready(v_date);
  return null;
end $$;
drop trigger if exists trg_incoming_stock on public.incoming;
create trigger trg_incoming_stock after insert or update or delete on public.incoming
  for each row execute function public.refresh_stock_ready_trigger();

select public.refresh_stock_ready(current_date);

------------------- RLS (optional, demo role) ---------------------------------
-- update SKEMA live masih anon; tambah policy anon utk tabel baru biar FE baca.
do $$ begin
  execute 'alter table public.product_catalog    enable row level security';
  execute 'alter table public.opening_stock     enable row level security';
  execute 'alter table public.production        enable row level security';
  execute 'alter table public.production_parts  enable row level security';
  execute 'alter table public.sales_items       enable row level security';
  execute 'alter table public.stock_ready       enable row level security';
end $$;

drop policy if exists anon_read_opening_stock on public.opening_stock;
create policy anon_read_opening_stock on public.opening_stock for select using (true);
drop policy if exists anon_read_production on public.production;
create policy anon_read_production on public.production for select using (true);
drop policy if exists anon_read_production_parts on public.production_parts;
create policy anon_read_production_parts on public.production_parts for select using (true);
drop policy if exists anon_read_sales_items on public.sales_items;
create policy anon_read_sales_items on public.sales_items for select using (true);
drop policy if exists anon_read_stock_ready on public.stock_ready;
create policy anon_read_stock_ready on public.stock_ready for select using (true);

-- NOTE: sales/incoming/expenses/modul pakai anon inserts — tidak kita ubah
-- agar FE yang berjalan sekarang tetap bisa tulis. Tren ke role di fase 4 gap.