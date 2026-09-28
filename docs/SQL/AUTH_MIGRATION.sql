-- ============================================================
-- AUTH_MIGRATION.sql
-- Tambah kolom password_hash ke tabel users (login aplikasi).
-- Jalankan di Supabase SQL Editor (project cftkiebockgjdnlzuppp).
-- Idempotent aman dijalankan berulang.
-- ============================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users'
      and column_name = 'password_hash'
  ) then
    alter table public.users add column password_hash text;
  end if;
end $$;

-- Email unik sudah ada (constraint dari PRD_DDL). Pastikan tidak null-hash
-- tidak menghalangi login: seed bikin hash; user tanpa hash = tak bisa login dsb.
-- (Opsional) revoke anon langsung bila kamu mau tutup jalur anon ke users:
-- revoke all on public.users from anon, authenticated;