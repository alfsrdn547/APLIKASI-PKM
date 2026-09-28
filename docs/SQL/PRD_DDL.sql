-- ============================================================================
-- RPH — DATABASE DDL (PostgreSQL / Supabase)
-- Menurut PRD: Bagian 4 (Modul & Struktur Data) & Bagian 5 (Validasi & Non-Fungsional)
-- Termasuk: constraint angka positif, enum role, audit log, trigger stok siap produksi.
-- Dijalankan di Supabase SQL Editor. Idempotent (aman dijalankan berulang).
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN A. ENUM & TIPE
-- ────────────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.user_role       as enum ('operator', 'pemilik');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status    as enum ('pending', 'processing', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pay_status      as enum ('lunas', 'belum_lunas');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pickup_status   as enum ('sudah_diambil', 'belum_diambil');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_unit    as enum ('kg', 'ekor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.expense_direction as enum ('keluar', 'masuk');
exception when duplicate_object then null; end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN B. USERS
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  full_name    text not null default '',
  role         public.user_role not null default 'operator',
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN C. MODUL 1 — PENERIMAAN (Barang Datang)
-- Rumus stok siap produksi: (Stok Lama + Total Ekor Masuk) − Ekor Mati
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.incoming (
  id                uuid primary key default gen_random_uuid(),
  date              date not null,
  nopol             text not null default '',
  tonase_kg         numeric(12,2) not null default 0 check (tonase_kg  >= 0),
  total_ekor        integer     not null default 0 check (total_ekor  >= 0),
  harga_per_kg      numeric(14,2) not null default 0 check (harga_per_kg >= 0),
  total_harga       numeric(16,2) not null default 0,
  ekor_mati         integer     not null default 0 check (ekor_mati >= 0),
  kasbon            numeric(16,2) not null default 0 check (kasbon >= 0),
  notes             text not null default '',
  created_by        uuid references public.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  -- Konsistensi: ekor mati tidak boleh melebihi total ekor
  constraint incoming_dead_le_total check (ekor_mati <= total_ekor),
  -- Angka positif wajib (>0) utk field inti (kecuali optional punya check >=0):
  constraint incoming_ekor_pos check (total_ekor > 0)
);

-- stok lama/awal (Modul 1 — "Input Stok Lama/Awal Ayam")
create table if not exists public.opening_stock (
  id            uuid primary key default gen_random_uuid(),
  date          date not null unique,
  opening_ekor  integer not null default 0 check (opening_ekor >= 0),
  created_by    uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN D. MODUL 2 — PRODUKSI & PAPAN TULIS
-- Kode barang sesuai PRD: Ayam Utuh (PC, KRKS), Daging (BLD, BLD-K, BLP, BLP-K,
-- PAHA[P,U,A], SAYAP[B,R]), Sampingan (CKR, KPL, KULIT, USUS, ATI, TULANG).
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.product_catalog (
  code      text primary key,
  name      text not null,
  unit      public.product_unit not null default 'kg',
  category  text not null default 'lainnya'
);

-- Produksi harian: dari berapa ekor dipotong jadi berapa potongan (kg)
create table if not exists public.production (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  incoming_id   uuid references public.incoming (id) on delete set null,
  chicken_cut   integer not null default 0 check (chicken_cut > 0),
  notes         text not null default '',
  created_by    uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

-- Hasil potongan detail (mapping ke kode barang)
create table if not exists public.production_parts (
  id            uuid primary key default gen_random_uuid(),
  production_id uuid not null references public.production (id) on delete cascade,
  product_code  text not null references public.product_catalog (code),
  qty_kg        numeric(10,2) not null default 0 check (qty_kg >= 0),
  unique (production_id, product_code)
);

-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN E. MODUL 3 — PENJUALAN & KASBON (Barang Keluar)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.sales (
  id             uuid primary key default gen_random_uuid(),
  date           date not null,
  customer_name  text not null,
  customer_phone text not null default '',
  nopol          text not null default '',
  method_payment text not null default 'cash',     -- cash / transfer / dll
  status         public.order_status  not null default 'pending',
  pay_status     public.pay_status    not null default 'belum_lunas',
  pickup_status  public.pickup_status not null default 'belum_diambil',
  total_amount   numeric(16,2) not null default 0 check (total_amount > 0),
  paid_amount    numeric(16,2) not null default 0 check (paid_amount >= 0),
  kasbon         numeric(16,2) not null default 0 check (kasbon >= 0),
  bonus_kg       numeric(10,2) not null default 0 check (bonus_kg >= 0),
  notes          text not null default '',
  created_by     uuid references public.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  -- Piutang/sisa tagihan = total − paid; tidak boleh negatif
  constraint sales_paid_le_total check (paid_amount <= total_amount)
);

-- Item penjualan (deliverable)
create table if not exists public.sales_items (
  id           uuid primary key default gen_random_uuid(),
  sales_id     uuid not null references public.sales (id) on delete cascade,
  product_code text not null references public.product_catalog (code),
  quantity     numeric(10,2) not null check (quantity > 0),
  unit_price   numeric(14,2) not null check (unit_price > 0),
  subtotal     numeric(16,2) not null default 0,
  unique (sales_id, product_code)
);

-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN F. MODUL 4 — PENGELUARAN & LAPORAN KEUANGAN
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  category    text not null,
  direction   public.expense_direction not null default 'keluar',
  source_fund text not null default 'kas',        -- kas / bank / dll
  amount      numeric(16,2) not null check (amount > 0),   -- Positif (>0) PRD
  notes       text not null default '',
  created_by  uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN G. AUDIT LOG (PRD Bagian 5 — jejak user/operator)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.audit_log (
  id          bigserial primary key,
  actor       text not null,                       -- email / nama user
  user_id     uuid references public.users (id) on delete set null,
  method      text not null,
  path        text not null,
  entity      text not null,
  entity_id   text,
  action      text not null,                       -- create | update | delete
  changes     jsonb not null default '{}',         -- {before, after}
  status_code smallint not null,
  ip          text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_entity   on public.audit_log (entity, entity_id);
create index if not exists idx_audit_created  on public.audit_log (created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN H. TRIGGER — AUTO-UPDATE TOTAL (Stok Siap Produksi)
-- Stok Siap Produksi = (Stok Lama + Total Ekor Masuk) − Ekor Mati
-- ────────────────────────────────────────────────────────────────────────────

-- 1) Hitung total_harga otomatis di incoming: total_ekor × harga_per_kg
create or replace function public.fnc_incoming_total_harga()
returns trigger language plpgsql as $$
begin
  new.total_harga := coalesce(new.total_ekor, 0) * coalesce(new.harga_per_kg, 0);
  return new;
end $$;

drop trigger if exists trg_incoming_total_harga on public.incoming;
create trigger trg_incoming_total_harga
  before insert or update on public.incoming
  for each row execute function public.fnc_incoming_total_harga();

-- 2) Hitung subtotal tiap item + total_amount penjualan (server-side murni)
create or replace function public.fnc_sales_subtotal()
returns trigger language plpgsql as $$
begin
  new.subtotal := round(coalesce(new.quantity,0) * coalesce(new.unit_price,0), 2);
  return new;
end $$;

drop trigger if exists trg_sales_items_subtotal on public.sales_items;
create trigger trg_sales_items_subtotal
  before insert or update on public.sales_items
  for each row execute function public.fnc_sales_subtotal();

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

create or replace function public.fnc_sales_recalc_total(p_sales_id uuid)
returns void language plpgsql as $$
declare
  v_total numeric;
begin
  select coalesce(sum(subtotal),0) into v_total
    from public.sales_items where sales_id = p_sales_id;
  update public.sales set total_amount = v_total where id = p_sales_id;
end $$;

drop trigger if exists trg_sales_items_recalc on public.sales_items;
create trigger trg_sales_items_recalc
  after insert or update or delete on public.sales_items
  for each row execute function public.fnc_sales_recalc_trigger();

-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN I. STORED PROCEDURE — STOK SIAP PRODUKSI HARIAN
-- Stok Siap Produksi = (Stok Lama + Total Ekor Masuk) − Ekor Mati (per tanggal)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.stok_siap_produksi(p_date date)
returns table (
  date           date,
  stok_lama      bigint,
  ekor_masuk     bigint,
  ekor_mati      bigint,
  stok_siap      bigint
) language sql stable as $$
  select
    d.date,
    coalesce(os.opening_ekor, 0)                              as stok_lama,
    coalesce(sum(i.total_ekor), 0)                            as ekor_masuk,
    coalesce(sum(i.ekor_mati), 0)                             as ekor_mati,
    (coalesce(os.opening_ekor, 0) + coalesce(sum(i.total_ekor), 0)
          - coalesce(sum(i.ekor_mati), 0))                    as stok_siap
  from (select p_date::date as date) d
  left join public.opening_stock os on os.date = d.date
  left join public.incoming i   on i.date = d.date
  group by d.date, os.opening_ekor;
$$;

-- Materialisasi stok siap tiap perubahan incoming/opening (utk snapshot/papan tulis)
create table if not exists public.stock_ready (
  date           date primary key,
  stok_lama      bigint not null default 0,
  ekor_masuk     bigint not null default 0,
  ekor_mati      bigint not null default 0,
  stok_siap      bigint not null default 0
);

create or replace function public.refresh_stock_ready()
returns void language plpgsql as $$
begin
  delete from public.stock_ready;
  insert into public.stock_ready (date, stok_lama, ekor_masuk, ekor_mati, stok_siap)
  select date, stok_lama, ekor_masuk, ekor_mati, stok_siap
    from public.stok_siap_produksi(current_date);
end $$;

drop trigger if exists trg_incoming_stock on public.incoming;
create trigger trg_incoming_stock
  after insert or update or delete on public.incoming
  execute function public.refresh_stock_ready_trigger();

create or replace function public.refresh_stock_ready_trigger()
returns trigger language plpgsql as $$
begin
  perform public.refresh_stock_ready();
  return null;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN J. VALIDASI TANGGAL TIDAK MASA DEPAN (server-side guard)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.fnc_block_future(p_date date)
returns void language plpgsql as $$
begin
  if p_date > current_date then
    raise exception 'FUTURE_DATE: tanggal tidak boleh di masa depan';
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN K. ROW LEVEL SECURITY — role operator vs pemilik
-- ────────────────────────────────────────────────────────────────────────────
do $$ begin
  execute 'alter table public.incoming          enable row level security';
  execute 'alter table public.opening_stock     enable row level security';
  execute 'alter table public.production        enable row level security';
  execute 'alter table public.production_parts  enable row level security';
  execute 'alter table public.sales             enable row level security';
  execute 'alter table public.sales_items       enable row level security';
  execute 'alter table public.expenses          enable row level security';
  execute 'alter table public.audit_log         enable row level security';
  execute 'alter table public.stock_ready       enable row level security';
end $$;

-- Contoh kebijakan berbasis role. PRD: Operator = CRUD, Pemilik = read-only.
-- Versi kompak: 2 role. Perlu disesuaikan dgn mekanisme auth backend:
--   • Jika pakai Supabase Auth (JWT) → policy mengikuti JWT role.
--   • Versi internal single-user anon-key (yg jalan di FE sekarang) →
--     gunakan "to anon" atau tanpa role, integritas ditanggung API/service_layer.
drop policy if exists "rls_incoming_operator_full" on public.incoming;
create policy "rls_incoming_operator_full" on public.incoming for all
  using (true) with check (true);
  -- Operator: full CRUD pada semua row (single-unit).

-- Pemilik (viewer) dibatasi SELECT-only melalui READ dari aplikasi/server.
-- Kalau mau strict DB-side:
--   revoke insert, update, delete on public.incoming from pemilik_role;

-- (Policy per-tabel diperluas pakai pola yang sama: operator CRUD, pemilik SELECT.)

-- ────────────────────────────────────────────────────────────────────────────
-- BAGIAN L. SEED — KODE BARANG PRODUKSI (dari PRD Modul 2)
-- ────────────────────────────────────────────────────────────────────────────
insert into public.product_catalog (code, name, unit, category) values
  ('PC', 'Ayam Utuh Parting/Potong',        'kg',   'ayam_utuh'),
  ('KRKS', 'Ayam Utuh Karkas',              'kg',   'ayam_utuh'),
  ('BLD', 'Boneless Dada',                  'kg',   'daging'),
  ('BLD-K', 'Boneless Dada Kulit',           'kg',   'daging'),
  ('BLP', 'Boneless Paha',                  'kg',   'daging'),
  ('BLP-K', 'Boneless Paha Kulit',           'kg',   'daging'),
  ('PAHA-P', 'Paha (P)',                     'kg',   'daging'),
  ('PAHA-U', 'Paha (U)',                     'kg',   'daging'),
  ('PAHA-A', 'Paha (A)',                     'kg',   'daging'),
  ('SAYAP-B', 'Sayap (B)',                   'kg',   'daging'),
  ('SAYAP-R', 'Sayap (R)',                   'kg',   'daging'),
  ('CKR', 'Cakar',                           'kg',   'sampingan'),
  ('KPL', 'Kepala',                          'ekor', 'sampingan'),
  ('KULIT', 'Kulit',                         'kg',   'sampingan'),
  ('USUS', 'Usus',                           'kg',   'sampingan'),
  ('ATI', 'Ati',                             'kg',   'sampingan'),
  ('TULANG', 'Tulang',                       'kg',   'sampingan')
on conflict (code) do nothing;

-- ────────────────────────────────────────────────────────────────────────────
-- (Opsional) Versi MySQL / MariaDB — konversi ringkas utk shared hosting
-- ────────────────────────────────────────────────────────────────────────────
-- CREATE TABLE incoming (
--   id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
--   date DATE NOT NULL,
--   nopol VARCHAR(20) DEFAULT '',
--   tonase_kg DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tonase_kg >= 0),
--   total_ekor INT NOT NULL DEFAULT 0 CHECK (total_ekor >= 0),
--   harga_per_kg DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (harga_per_kg >= 0),
--   total_harga DECIMAL(16,2) NOT NULL DEFAULT 0,
--   ekor_mati INT NOT NULL DEFAULT 0 CHECK (ekor_mati <= total_ekor),
--   ...
-- );
-- MySQL 8+ dukung CHECK & enum via ENUM('operator','pemilik'); UUID() di 8.0.16+.
-- MySQL TIDAK dukung tipe enum db-level; gunakan VARCHAR + CHECK.
-- (Trigger MySQL: BEFORE INSERT utk total_harga, dsb — sintaks di-defer sampai user
--  pilih hosting. Utama: PostgreSQL/Supabase sesuai lingkungan aktif.)