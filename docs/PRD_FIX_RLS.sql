-- ============================================================================
-- RPH — TAMBAHAN FIX (setelah ALTER jalan)
-- product_catalog belum punya RLS read utk anon → anon select 0 row.
-- Tambahan: grant read utk anon, + verbatim RLS utk tabel yang butuh (production_parts).
-- Idempotent. Jalanin sekali di SQL Editor.
-- ============================================================================

alter table public.product_catalog enable row level security;
alter table public.production_parts  enable row level security;

drop policy if exists anon_read_product_catalog on public.product_catalog;
create policy anon_read_product_catalog on public.product_catalog for select using (true);

drop policy if exists anon_read_production_parts on public.production_parts;
create policy anon_read_production_parts on public.production_parts for select using (true);

-- (stock_ready/sales_items/etc sudah punya policy dari ALTER)