-- ────────────────────────────────────────────────────────────────────────────
-- Cabut sesi server-side (logout & reset password).
-- Jalankan DI SUPABASE (SQL Editor). Idempotent. OPSIONAL-AMAN:
-- sebelum file ini jalan, app tetap jalan (kode fallback tanpa kolom) —
-- cuma fitur revocation yang belum aktif.
--
-- Alur: users.token_valid_after = timestamp cabut. Token membawa `iat`;
-- iat < token_valid_after → sesi dianggap mati (logout di device lain
-- langsung ngefek, bukan cuma hapus cookie).
-- ────────────────────────────────────────────────────────────────────────────

alter table public.users
  add column if not exists token_valid_after timestamptz;

-- ── Verifikasi ──────────────────────────────────────────────────────────────
select column_name from information_schema.columns
where table_name = 'users' and column_name = 'token_valid_after';
-- Harus balik 1 baris.
