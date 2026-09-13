-- ============================================================================
-- RPH — FIX: trigger incoming → stock_ready gagal karena RLS anon.
-- `refresh_stock_ready()` dijalankan oleh trigger saat anon insert incoming,
-- tapi `stock_ready` RLS block insert anon → incoming E2E gagal (42501).
--
-- Solusi: jalankan as OWNER (SECURITY DEFINER) — function punya hak insert,
-- anon TETAP tidak bisa menulis stock_ready langsung. Idempotent.
-- ============================================================================

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

-- Pastikan grant execute utk anon/authenticated (function dipanggil trigger,
-- yg berjalan sebagai user pemicu = anon). Without grant, mungkin 403.
revoke all on function public.refresh_stock_ready(date) from public;
grant execute on function public.refresh_stock_ready(date) to anon, authenticated, service_role;

-- (trigger trg_incoming_stock sudah ada; function di-replace dgn definer.)