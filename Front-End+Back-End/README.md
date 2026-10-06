# RPH — Sistem Pencatatan

Digitalisasi pencatatan harian **Rumah Potong Hewan (RPH)** sesuai PRD.
**Backend = API Routes** (`src/app/api/*`) — semua CRUD lewat server (service-role Supabase), bukan anon key client. Login wajib (operator/pemilik).

---

## Panduan Penggunaan (untuk User)

### Login
Buka aplikasi → halaman **Masuk RPH**. Gunakan email + password yang dibuatkan pemilik.
- **Operator** — boleh input & ubah data (semua modul), impor Excel, cetak invoice.
- **Pemilik** — baca semua data + kelola akun operator di `/operator`. Tidak bisa ubah data transaksi (mode baca).
- Tidak ada pendaftaran mandiri. Lupa password → hubungi pemilik.

### Menu

| Menu | Fungsi |
|---|---|
| **Dashboard** | Ringkasan harian: omzet, pengeluaran, laba, chart |
| **Penerimaan** | Catat ayam masuk dari surat jalan + riwayat |
| **Pemotongan** | Konversi ayam jadi potongan (kg) — jadi sumber stok |
| **Papan Tulis** | Stok per kode barang, status Ready/Menipis/Habis |
| **Penjualan** | Form transaksi, riwayat, tagihan per pelanggan, cetak invoice |
| **Pengeluaran** | Beban operasional (es batu, borongan, … Plastik) |
| **Operator** | *(pemilik saja)* kelola akun operator |

### Penerimaan (Modul 1)
1. Isi **Tanggal**, **Ayam Masuk** (ekor), **Ayam Mati/Afkir** — wajib.
2. **No. Polisi** & **Tonase (kg)** juga **wajib** (kolom "opsional" sudah dihapus).
3. **Harga per Ekor** & **Kasbon** diisi sesuai surat jalan. **Total Harga** dihitung otomatis (ekor × harga per ekor).
4. Panel bawah menampilkan **Net Stok** (masuk − afkir) dan **Rata-rata Berat** (tonase ÷ ayam masuk) secara otomatis.
5. **Catatan/Supplier** opsional. Simpan.

### Pemotongan (Modul 2)
1. Isi **Tanggal** & **Jumlah Ayam Dipotong** → qty per potongan otomatis terisi (distribusi standar). Bisa disesuaikan manual.
2. **Harga/kg per potongan bisa diinput manual** — ganti sesuai harga hari itu. Prefill = harga default; nilai per baris & **total nilai** terhitung otomatis.
3. Harga tidak hilang antar input pada hari yang sama.
4. Simpan → stok Papan Tulis ikut bertambah.

### Penjualan (Modul 3)
1. **Form Transaksi**: tanggal, nama pembeli, pilih barang → qty & **harga bisa diedit per baris** (default = harga standard).
2. Stok menolak qty melebihi tersedia.
3. **Riwayat**: klik baris Selesai/Proses → cetak invoice. Kolom Pembayaran menampilkan badge + sisa.
4. **Tagihan per Customer** (bawah): akumulasi total, dibayar & sisa tiap pelanggan.
   - Klik baris pelanggan → daftar order-nya.
   - **Bayar 50%?** Ketik nominal di kolom Bayar per order → klik Bayar / Enter. Sisa & agregat ikut berubah. Status otomatis Lunas kalau sisa 0.
5. Bayar diterima dicatat per order (pilih order mana yang dibayar).

### Pengeluaran (Modul 3B)
Pilih kategori (**termasuk Plastik**), nominal, tanggal → simpan. Rekap di bawah tabel.

### Impor Excel (operator)
Tombol **⬆️ Import Data** di kanan atas → unduh template → isi → upload. Kolom wajib: `nopol`, `tonase_kg` (sama seperti form).

### Aturan validasi (ditolak otomatis)
- Tanggal tidak boleh masa depan.
- Ayam mati/afkir ≤ ayam masuk.
- Qty/harga harus > 0; stok menolak minus.
- No. polisi & tonase wajib di Penerimaan.

---

## Untuk Developer

### Stack
- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS** + **Zustand**
- **Supabase** (DB) + storage hash/token via `node:crypto` (tanpa dep eksternal)

### Cara Jalankan
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # produksi (sudah terverifikasi OK)
```

### Struktur Folder
```
src/
├── app/                     # routes (App Router)
│   ├── layout.tsx           # shell global (logo + metadata)
│   ├── page.tsx             # /            → Modul 4 Dashboard
│   ├── penerimaan/page.tsx  # /penerimaan  → Modul 1
│   ├── pemotongan/page.tsx  # /pemotongan  → Modul 2
│   ├── papan-tulis/page.tsx # /papan-tulis → Modul 2
│   ├── penjualan/page.tsx   # /penjualan   → Modul 3
│   ├── pengeluaran/page.tsx # /pengeluaran → Modul 3 (beban)
│   ├── operator/page.tsx    # /operator    → kelola akun (pemilik)
│   └── api/                 # API routes (auth, incoming, butchery, …)
├── components/
│   ├── ui/                  # primitives: Button, Input, Select, Table, Card, Badge
│   └── modules/             # fitur per modul (lihat bawah)
├── stores/useRPHStore.ts    # Zustand: incoming, sales, expenses + kalkulasi stok
├── constants/products.ts    # kode barang (PC, KRKS, BLD, …), harga, kategori
├── lib/                     # utils, validasi, auth (JWT-ish), audit, excel
└── types/                   # TypeScript interfaces
```

### Modul & Komponen
| Modul | Route | Komponen |
|---|---|---|
| M1 Penerimaan | `/penerimaan` | `IncomingForm` (net = masuk − afkir, rata-rata berat otomatis), `IncomingTable` |
| M2 Pemotongan | `/pemotongan` | `ButcherForm` (prefill distribusi, **harga/kg manual**), `ButcheryHistory` |
| M2 Papan Tulis | `/papan-tulis` | `WhiteboardGrid` (katalog stok, sortir, status Ready/Menipis/Habis) |
| M3 Penjualan | `/penjualan` | `SalesForm` (keranjang, cek stok), `SalesHistory`, `CustomerBillings` (akumulasi per pelanggan + bayar), `InvoicePrint` |
| M3 Pengeluaran | `/pengeluaran` | `ExpensesModule` (kategori beban, rekap) |
| M4 Dashboard | `/` | `DashboardContent` (stat, mini-chart, rekap), `ExportModal` (CSV/JSON/Print) |

### Validasi yang Sudah Berjalan
- **Auth**: semua route `/api/*` butuh sesi JWT (httpOnly cookie). Role `operator` boleh tulis data; `pemilik` read-only (403) tapi boleh kelola akun operator.
- **Stok menolak minus** — qty penjualan > stok tersedia ⇒ error per-item.
- **Harga/Qty positif** — ditolak ≤ 0.
- **Tanggal tidak boleh masa depan** — input `date` dibatasi `max=today` + validasi ulang di server.
- **Ayam afkir ≤ ayam masuk** — cross-field check Modul 1 (FE + API).
- **Nopol & tonase wajib** di Penerimaan (FE + API).

### Auth & Environment

Jalankan migrasi SQL di Supabase (folder `docs/SQL/` di root repo — sebelah folder ini):
- `AUTH_MIGRATION.sql` — kolom `password_hash`
- `PRODUCT_CATALOG_TAHAP3.sql` — Ceker, KRK, TULANG-L/I ✅ sudah dijalankan

**Akun pemilik pertama** — sekali jalan, butuh `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` di `.env.local`:
```bash
npm run admin admin@rph.sch.id "rahasia-kuat"
```
Idempotent — email yang sudah ada exit tanpa perubahan. Kalau row-nya ada tapi `password_hash` NULL (akun mati), jalankan ulang dengan `--force`.

**Setelah itu**, pemilik bikin akun operator dari `/operator` (nama + email + password). Nggak ada halaman daftar; operator cuma punya `/login`.

Set env (`.env.local` + Vercel):
| Var | Fungsi |
|---|---|
| `JWT_SECRET` | kunci sesi (acak, ≥32 char). Wajib di produksi — kosong = throw |

`requireAuth(req, mode)` punya 3 mode: `read` (semua role), `write` (operator saja), `admin` (pemilik saja).

### Output & State
- **Whiteboard** & **Dashboard** = computed dari store (re-derive tiap render, <2 detik).
- **Invoice 1 rangkap** — klik baris status Selesai/Proses di riwayat → tombol Cetak.
  Layout print ada di `src/app/globals.css` (`@media print`).
- **`butchery.parts[]`** menyimpan `{ productCode, qtyKg, priceKg }` (jsonb, tanpa migrasi).
