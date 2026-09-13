# Migrasi Skema Aktif vs PRD — Gap Analysis

Banding **skema aktif** (`Front-End/supabase/schema.sql`, yang dipakai FE live) dengan
**DDL PRD-compliant** (`docs/PRD_DDL.sql`). Tujuan: memetakan deviasi & langkah migrasi.

---

## 1. Ringkasan

| Aspek | Aktif (live) | PRD | Status |
|---|---|---|---|
| Tabel | `incoming, sales, expenses, butchery, whiteboard` | + `users, opening_stock, product_catalog, production, production_parts, sales_items, audit_log, stock_ready` | PRD jauh lebih lengkap |
| Auth | anon key (tanpa login) | role `operator`/`pemilik` | Perlu ditambah |
| Kode barang | 12 (PC/KRKS/BLD/DAD/PAH/...) | 17 (PC/KRKS/BLD-K/BLP/PAHA-P/U/A/...) | Berbeda list |
| Item penjualan | jsonb di `sales.items` | child table `sales_items` (normalisasi) | Bedah arsitektur |
| Pemotongan | tabel `butchery` | `production` + `production_parts` | Gap naming |
| Piutang/status bayar | None | `pay_status`, `pickup_status`, `kasbon`, `bonus_kg`, `paid_amount` | Belum ada di live |
| Pengeluaran | `category/direction? amount` | + `direction` (keluar/masuk), `source_fund` | direction belum |
| Audit log | Belum | `audit_log` | Belum di live |
| Stok siap | computed di FE (Zustand) | SP `stok_siap_produksi()` + `stock_ready` di DB | Pindah ke DB |
| Trigger | none | 4 trigger + auto-subtotal/total | Belum |

---

## 2. Gap per tabel

### `incoming`
| Kolom PRD | Aktif | Catatan |
|---|---|---|
| `nopol` | ✗ | Tambah utk invoice barang masuk |
| `tonase_kg`, `harga_per_kg`, `total_harga` | ✗ | Aktiv prisma `chicken_in/dead/broken` |
| `ekor_mati` | (ada di `chicken_dead`) | Rename |
| `kasbon` | ✗ | Tambah |
| `chicken_broken` | ✓ (live) | Di PRD gak dibahas (afkir ringan) — **pertahankan** |
| Constraint `ekor_mati <= total_ekor`, `total_ekor > 0` | parsial | Tambah |

### Modul 2 (produksi)
| Aktif | PRD |
|---|---|
| `butchery(date, incoming_id, chicken_count, parts jsonb)` | `production(date, incoming_id, chicken_cut)` + `production_parts(prod_id, product_code, qty_kg)` |

**Rekomendasi:** Migrasi `butchery` → `production` + `production_parts`. `parts` jsonb di-unflatten 1 baris → N baris. Kode barang perlu di-mapping ke `product_catalog`.

### `sales`
| PRD menambah | Aktif |
|---|---|
| `pay_status` (lunas/belum_lunas) | ✗ status `pending/processing/completed/cancelled` doang |
| `pickup_status` (sudah/belum diambil) | ✗ |
| `method_payment`, `nopol`, `bonus_kg`, `kasbon`, `paid_amount` | ✗ |
| `items` → tabel terpisah `sales_items` | jsonb `items` |
| `total_amount` via trigger | dihitung FE |

**Rekomendasi:** DB-side trigger recalc total (sudah di DDL). Piutang = `total_amount − paid_amount` (bisa di-calc). Normalisasi items besar — lakukan bertahap.

### `expenses`
| PRD | Aktif |
|---|---|
| `direction` enum keluar/masuk | ✗ (gak ada arah) |
| `source_fund` | ✗ |

### Baru yang belum ada di live
- `users`, `opening_stock`, `product_catalog`, `production_parts`, `stock_ready`, `audit_log`

---

## 3. Rencana migrasi (bertahap, dari yang paling menambah nilai)

**Fase 1 — tambahan non-ekstraktif (aman, tanpa kehilangan data)**
1. Tambah kolom `incoming` yang gak break: `nopol`, `tonase_kg`, `harga_per_kg`, `total_harga`, `kasbon` (nullable/0 default).
2. Buat `users` + seed admin (email/password via Supabase Auth).
3. Buat `audit_log` + hook/sidecar di backend utk nulis.
4. Buat `opening_stock` + UI "Stok Lama".
5. Buat `stok_siap_produksi()` SP + `stock_ready`.

**Fase 2 — normalisasi produksi**
6. Buat `product_catalog` (seed 17), `production`, `production_parts`.
7. Migrasi data: `butchery.parts` jsonb → `production_parts` rows (script SQL), remap kode.
8. Deprecate `butchery` → alias/fallback sampai FE update.

**Fase 3 — normalisasi sales + status**
9. Buat `sales_items`; unflatten `sales.items`.
10. Tambah `pay_status`, `pickup_status`, `method_payment`, `bonus_kg`, `paid_amount`, `kasbon`; backfill.
11. Trigger recalc `total_amount`.

**Fase 4 — role & keamanan**
12. RLS role-based; backend service_role; FE pakai token sesi (bukan anon).

**Fase 5 — expenses + penutup**
13. Tambah `direction`, `source_fund`; seed kategori.
14. Hapus kolom/`butchery` lama setelah FE 100% migrasi.

---

## 4. Risiko & catatan
- **Norm name kode** (DAD vs BLD-K, dst) — remap mapping tabel bernama saat migrasi; jangan guess.
- **`butchery` data existing** (kalau ada) — harus di-unflatten benar.
- **RLS anon→role** — pindah berisiko user gak bisa akses selama transisi; lakukan belakang layar + uji.
- Trigger baru mengganti hitungan FE — pastikan FE stop hitung sendiri (jangan double).

*(Dokumen ini bisa jadi panduan; eksekusi manual bertahap via SQL Editor Supabase.)*