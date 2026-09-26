# RPH — Sistem Pencatatan (Frontend)

Digitalisasi pencatatan harian Rumah Potong Hewan (RPH) sesuai PRD.
**Backend = API Routes** (`src/app/api/*`) — semua CRUD lewat server (service-role Supabase), bukan anon key client. Login wajib (operator/pemilik).

## Stack
- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS** + **Zustand**
- **Supabase** (DB) + storage hash/token via `node:crypto` (tanpa dep eksternal)

## Cara Jalankan
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # produksi (sudah terverifikasi OK)
```

## Struktur Folder
```
src/
├── app/                     # routes (App Router)
│   ├── layout.tsx           # shell global
│   ├── page.tsx             # /            → Modul 4 Dashboard
│   ├── penerimaan/page.tsx  # /penerimaan  → Modul 1
│   ├── papan-tulis/page.tsx # /papan-tulis → Modul 2
│   ├── penjualan/page.tsx   # /penjualan   → Modul 3
│   └── pengeluaran/page.tsx # /pengeluaran → Modul 3 (beban)
├── components/
│   ├── ui/                  # primitives: Button, Input, Select, Table, Card, Badge, Tabs, StatCard
│   └── modules/             # fitur per modul (lihat bawah)
├── stores/useRPHStore.ts    # Zustand: incoming, sales, expenses + kalkulasi stok
├── constants/products.ts    # kode barang (PC, KRKS, BLD, …), harga, kategori
├── lib/                     # utils (format Rp, validasi), mock-data
└── types/                   # TypeScript interfaces
```

## Modul & Komponen
| Modul | Route | Komponen |
|---|---|---|
| M1 Penerimaan | `/penerimaan` | `IncomingForm` (kalkulasi net = masuk − mati), `IncomingTable` |
| M2 Papan Tulis | `/papan-tulis` | `WhiteboardGrid` (katalog stok, sortir, status Ready/Menipis/Habis) |
| M3 Penjualan | `/penjualan` | `SalesForm` (keranjang, cek stok), `SalesHistory` (filter/sort), `InvoicePrint` |
| M3 Pengeluaran | `/pengeluaran` | `ExpensesModule` (kategori beban, rekap) |
| M4 Dashboard | `/` | `DashboardContent` (stat, mini-chart, rekap), `ExportModal` (CSV/JSON/Print) |

## Validasi yang Sudah Berjalan
- **Auth**: semua route `/api/*` butuh sesi JWT (httpOnly cookie). Role `operator` boleh tulis data; `pemilik` read-only (403) tapi boleh kelola akun operator.
- **Stok menolak minus** — qty penjualan > stok tersedia ⇒ error per-item.
- **Harga/Qty positif** — ditolak ≤ 0.
- **Tanggal tidak boleh masa depan** — input `date` dibatasi `max=today` + validasi ulang.
- **Ayam mati ≤ ayam masuk** — cross-field check di Modul 1.

## Auth & Environment

Jalankan `docs/AUTH_MIGRATION.sql` di Supabase (tambah kolom `password_hash` di `users`).

**Akun pemilik pertama** — sekali jalan, butuh `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` di `.env.local`:
```bash
node scripts/create-admin.mjs admin@rph.sch.id "rahasia-kuat"
```
Idempotent — email yang sudah ada exit tanpa perubahan.

**Setelah itu**, pemilik bikin akun operator dari `/operator` (nama + email + password). Nggak ada halaman daftar; operator cuma punya `/login`.

Set env (`.env.local` + Vercel):
| Var | Fungsi |
|---|---|
| `JWT_SECRET` | kunci sesi (acak, ≥32 char). Wajib di produksi — kosong = throw |

`requireAuth(req, mode)` punya 3 mode: `read` (semua role), `write` (operator saja), `admin` (pemilik saja).

## Output & State
- **Whiteboard** & **Dashboard** = computed dari store (re-derive tiap render, <2 detik).
- **Invoice 2 rangkap** — klik baris status Selesai/Proses di riwayat → tombol Cetak.
  Layout print ada di `src/app/globals.css` (`@media print`): 2 lembar per A4, garis putus antar rangkap.