-- ────────────────────────────────────────────────────────────────────────────
-- Tahap 3 — Update katalog barang (permintaan tim, 2026-10)
-- Jalankan DI SUPABASE (SQL Editor). Idempotent — aman dijalankan berulang.
--
-- Perubahan:
--   1. CKR  : nama "Cakar"  → "Ceker" (typo)
--   2. KRK  : barang BARU  → Kerongkongan
--   3. TULANG-L / TULANG-I : 2 jenis tulang hasil trimming (BARU)
--   4. TULANG (kode lama)  : TETAP — record penjualan lama masih pakai
--
-- Kenapa file ini wajib: tabel sales_items punya FK ke product_catalog(code).
-- Tanpa insert di bawah, penjualan item baru KRK / TULANG-L / TULANG-I
-- gagal 500 di server (FK violation).
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Fix typo: Cakar → Ceker
update public.product_catalog
set name = 'Ceker'
where code = 'CKR';

-- 2-3. Barang baru (ON CONFLICT = idempotent, gak dobel kalau dijalankan lagi)
insert into public.product_catalog (code, name, unit, category) values
  ('KRK',      'Kerongkongan', 'kg', 'sampingan'),
  ('TULANG-L', 'Tulang (L)',   'kg', 'sampingan'),
  ('TULANG-I', 'Tulang (I)',   'kg', 'sampingan')
on conflict (code) do update
  set name     = excluded.name,
      unit     = excluded.unit,
      category = excluded.category;

-- 4. TULANG lama: pastikan masih ada (kode legacy, record lama pakai ini)
insert into public.product_catalog (code, name, unit, category) values
  ('TULANG', 'Tulang', 'kg', 'sampingan')
on conflict (code) do nothing;

-- ── Verifikasi ──────────────────────────────────────────────────────────────
select code, name, unit, category
from public.product_catalog
where code in ('CKR', 'KRK', 'TULANG', 'TULANG-L', 'TULANG-I')
order by code;
-- Ekspektasi 5 baris: CKR=Ceker, KRK=Kerongkongan, TULANG=Tulang,
--                     TULANG-I=Tulang (I), TULANG-L=Tulang (L)
