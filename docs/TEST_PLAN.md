# RPH — Test Plan & Test Case

**Dokumen:** Test Plan & Test Case — fokus **validasi stok penjualan (real-time)** & **pencetakan/ekspor laporan (PDF/Excel)**
**Dipetakan ke:** `docs/API_SPEC.md` (validasi), `src/components/modules/*` (FE), backend PHP (`Back-End/`), PRD Bagian 5.

---

## 1. Ruang Lingkup (Scope)

| Area | Komponen | Keterangan |
|---|---|---|
| Validasi stok penjualan | `SalesForm.tsx`, `useRPHStore.getStockForDate`, `getWhiteboard` (manual butchery = sumber) | Menolak qty jual > stok real-time |
| Ekspor laporan | `ExportModal.tsx` (CSV/JSON/Print), `DashboardContent` (rekap) | CSV "Excel", JSON, Print/PDF (via browser print) |
| Print invoice | `InvoicePrint.tsx` (order) | Invoice 2 rangkap |

**Environment uji:** Vercel prod `aplikasi-pkm.vercel.app`, Supabase project `cftkiebockgjdnlzuppp`, browser desktop (Chrome/Edge) + Windows.

---

## 2. Data Uji (Precondition)

- **Pemotongan masuk** tanggal `T` (misal hari ini) cukup utk kode `PC`: catat `butchery` dgn `PC: 100 kg`.
- Pastikan stok tersedia via `/papan-tulis` tanggal `T` → `PC closingStock = 100`.
- Jangan ada order lain tanggal `T` untuk `PC` (biar hitungan bersih).

---

## 3. Validasi Stok Penjualan (Modul Penjualan)

### TC-STK-01: Penjualan qty ≤ stok → diterima
| Item | Isi |
|---|---|
| **Test Scenario** | User input order dgn qty item = stok tersedia persis |
| **Test Steps** | 1. Buka `/penjualan`. 2. Pilih `PC`, qty `100` (stok = 100), harga valid. 3. Isi nama pemesan. 4. Simpan. |
| **Expected Result** | Order tersimpan (muncul di riwayat), total dihitung benar. Stok papan tulis `PC closing` turun jadi 0. |
| **Pass/Fail Criteria** | **PASS** jika order sukses & stok `closing` = 0. |

### TC-STK-02: Penjualan qty < stok → diterima & stok sisa benar
| Item | Isi |
|---|---|
| **Test Scenario** | Order sebagian, stok sisa tersisa |
| **Test Steps** | 1. Order `PC` qty `60` dari stok 100. 2. Simpan. 3. Cek papan tulis T. |
| **Expected Result** | Order sukses. `PC closing` = `100 − 60 = 40`. |
| **Pass/Fail Criteria** | **PASS** jika closing = 40. |

### TC-STK-03: Penjualan qty > stok → ditolak dengan pesan stok
| Item | Isi |
|---|---|
| **Test Scenario** | User input qty melebihi stok real-time |
| **Test Steps** | 1. Order `PC` qty `120` (stok = 100). 2. Simpan. |
| **Expected Result** | Order **TIDAK tersimpan**. Muncul error per-item: `Stok tidak cukup (tersedia 100)`. Tidak ada row baru di riwayat, stok tidak berubah. |
| **Pass/Fail Criteria** | **PASS** jika order ditolak + pesan error muncul + data utuh. |

### TC-STK-04: Stok real-time ter-update setelah order sebelumnya
| Item | Isi |
|---|---|
| **Test Scenario** | 2 order beruntun memakai stok yg sama |
| **Test Steps** | 1. Order 1 `PC` qty 70. 2. Order 2 `PC` qty 50 (sisa 30). |
| **Expected Result** | Order 1 sukses. Order 2 **ditolak** (`tersedia 30`). Total jual terakumulasi (outgoing = 70). |
| **Pass/Fail Criteria** | **PASS** jika order 2 ditolak sesuai sisa. |

### TC-STK-05: Validasi angka negatif / kosong pada qty
| Item | Isi |
|---|---|
| **Test Scenario** | Qty tidak valid (0 / negatif / kosong) |
| **Test Steps** | 1. Order `PC` qty `0`, atau kosong. 2. Simpan. |
| **Expected Result** | Error `Qty harus angka positif`. Order tidak tersimpan. |
| **Pass/Fail Criteria** | **PASS** jika error muncul & order ditolak. |

### TC-STK-06: Tanpa pemotongan di tanggal itu → stok 0 → semua jual ditolak
| Item | Isi |
|---|---|
| **Test Scenario** | Tanggal `T` tidak ada butchery (stok 0 per papan tulis) |
| **Test Steps** | 1. Buka `/penjualan`, tanggal utk hari tanpa butchery. 2. Order `PC` qty `1`. 3. Simpan. |
| **Expected Result** | Order ditolak (`tersedia 0`). Papan tulis mengindikasikan stok 0 (banner kuning). |
| **Pass/Fail Criteria** | **PASS** jika order ditolak dgn `tersedia 0`. |

### TC-STK-07: Tanggal masa depan → ditolak
| Item | Isi |
|---|---|
| **Test Scenario** | Order pakai tanggal besok |
| **Test Steps** | 1. Set tanggal = hari masa depan. 2. Isi order valid. 3. Simpan. |
| **Expected Result** | Error `Tanggal tidak boleh di masa depan`. Order tidak tersimpan. |
| **Pass/Fail Criteria** | **PASS** jika error muncul & order ditolak. |

### TC-STK-08: Order tanpa pemesan / tanpa item → validasi wajib
| Item | Isi |
|---|---|
| **Test Scenario** | Field wajib kosong |
| **Test Steps** | 1. Tidak isi nama pemesan → simpan. 2. (Reset) cart kosong → simpan. |
| **Expected Result** | Error `Nama pemesan wajib diisi` / `Tambahkan minimal 1 item`. |
| **Pass/Fail Criteria** | **PASS** jika error sesuai & order ditolak. |

---

## 4. Pencetakan / Ekspor Laporan (Dashboard → Ekspor)

### TC-EXP-01: Ekspor CSV (7/14/30 hari) → file unduh & terbaca Excel
| Item | Isi |
|---|---|
| **Test Scenario** | Buka modal ekspor, pilih CSV, download |
| **Test Steps** | 1. Dashboard → tombol Ekspor. 2. Pilih CSV + rentang 7 hari. 3. Klik Download. |
| **Expected Result** | File `laporan-rph-7d.csv` terunduh. Buka di Excel: header 8 kolom (`tanggal, ayam_masuk, ayam_mati, produksi_bersih, jumlah_transaksi, omset, pengeluaran, laba`) + baris data sesuaikan jumlah hari. **Catatan QA:** karakter Indonesia (é, ñ, Rp) harus terbaca benar (perlu UTF-8 BOM). |
| **Pass/Fail Criteria** | **PASS** jika file unduh, kolom benar, & terbaca di Excel tanpa karakter rusak. |

### TC-EXP-02: Ekspor CSV — nilai & agregasi benar
| Item | Isi |
|---|---|
| **Test Scenario** | Verifikasi angka di CSV sesuai dashboard |
| **Test Steps** | 1. Catat 1 tanggal dgn data (masuk/mati/omset/pengeluaran). 2. Ekspor CSV 7d. 3. Cek baris tanggal tsb. |
| **Expected Result** | Nilai per kolom sama persis dgn dashboard. `laba = omset − pengeluaran`. |
| **Pass/Fail Criteria** | **PASS** jika konsisten. |

### TC-EXP-03: Ekspor JSON → struktur valid
| Item | Isi |
|---|---|
| **Test Scenario** | Download JSON, validasi struktur |
| **Test Steps** | 1. Pilih JSON + 7d. 2. Download. 3. Buka file / `JSON.parse`. |
| **Expected Result** | File `.json` valid, array objek dgn key yang sama (camelCase). |
| **Pass/Fail Criteria** | **PASS** jika valid & struktur konsisten. |

### TC-EXP-04: Print / PDF via browser
| Item | Isi |
|---|---|
| **Test Scenario** | Cetak laporan via dialog print browser |
| **Test Steps** | 1. Pilih format **Print**. 2. Klik Cetak. 3. Di dialog, pilih "Simpan sebagai PDF" / printer. |
| **Expected Result** | Dialog print muncul. **Bug QA:** saat ini `window.print()` mencetak **seluruh halaman** (dashboard + modal), bukan hanya rekap — hasil PDF kelebihan konten. |
| **Pass/Fail Criteria** | **PASS** bila hanya rekap yg tercetak. **FAIL** bila seluruh dashboard ikut (kondisi saat ini). |

### TC-EXP-05: Print Invoice penjualan (2 rangkap)
| Item | Isi |
|---|---|
| **Test Scenario** | Cetak invoice order tertentu |
| **Test Steps** | 1. Buka `/penjualan`. 2. Klik order → Invoice. 3. Cetak. |
| **Expected Result** | Keluar 2 lembar (rangkap admin + customer) dgn header, item, total, tanda tangan. |
| **Pass/Fail Criteria** | **PASS** jika 2 lembar + isi benar. |

### TC-EXP-06: Rentang laporan — filter 30 hari benar
| Item | Isi |
|---|---|
| **Test Scenario** | Rentang berbeda menghasilkan baris berbeda |
| **Test Steps** | 1. Ada data >7 hari lalu. 2. Ekspor 7d vs 30d. 3. Banding jumlah baris. |
| **Expected Result** | 30d ≥ 7d; cutoff mengikuti rentang. |
| **Pass/Fail Criteria** | **PASS** jika jumlah baris sesuai rentang. |

---

## 5. Ringkasan & Prioritas

| Prioritas | Skenario | Kondisi saat ini |
|---|---|---|
| **P0** (blocker) | TC-STK-03, 04, 06 (stok berlebih) | ✅ Berfungsi (validasi FE) |
| **P1** (high) | TC-STK-01, 02, 05, 07, 08 | ✅ Berfungsi |
| **P1** | TC-EXP-01 (CSV/Excel UTF-8), TC-EXP-02, 03 | ⚠️ Sebagian — CSV **belum ada UTF-8 BOM**; perlu verifikasi Excel |
| **P2** (medium) | TC-EXP-04 (Print → PDF) | ❌ **Bug**: `window.print()` cetak seluruh halaman, bukan rekap saja |
| **P2** | TC-EXP-05 (invoice), TC-EXP-06 | ✅ Berfungsi |

**Temuan QA yang perlu di-fix (sebelum release penuh):**
1. **Print PDF laporan** (TC-EXP-04) — buat area print khusus (`@media print` / print-specific DOM), bukan `window.print()` seluruh halaman.
2. **CSV Excel** (TC-EXP-01) — tambah UTF-8 BOM (`﻿`) di front file biar kolom Indonesia terbaca benar di Excel; pastikan delimiter aman (nilai angka tidak mengandung koma — verifikasi).

---

## 6. Catatan Eksekusi
- Semua test dijalankan manual di browser + Supabase.
- Setup ulang sebelum tiap TC-STK: reset penjualan `PC` di tanggal uji (atau pakai tanggal baru) biar stok konsisten.
- Hasil: tandai PASS/FAIL + lampirkan screenshot/bukti (error message, CSV terbuka, PDF hasil).