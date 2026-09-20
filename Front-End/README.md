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
- **Auth**: semua route `/api/*` butuh sesi JWT (httpOnly cookie). Role `operator` boleh tulis; `pemilik` read-only (403).
- **Stok menolak minus** — qty penjualan > stok tersedia ⇒ error per-item.
- **Harga/Qty positif** — ditolak ≤ 0.
- **Tanggal tidak boleh masa depan** — input `date` dibatasi `max=today` + validasi ulang.
- **Ayam mati ≤ ayam masuk** — cross-field check di Modul 1.

## Auth & Environment

Jalankan `docs/AUTH_MIGRATION.sql` di Supabase (tambah kolom `password_hash` di `users`).

Set env (`.env.local` + Vercel):
| Var | Fungsi |
|---|---|
| `JWT_SECRET` | kunci sesi (acak, ≥32 char) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | akun `pemilik` awal (dibuat otomatis saat login pertama, idempotent) |
| `INVITE_TOKEN_HASH` | hash scrypt dari token undangan utk `/register` (lihat bawah) |

Generate `INVITE_TOKEN_HASH` (di `Front-End/src`):
```bash
node -e "const{scryptSync,randomBytes}=require('node:crypto');const t='isi-token-undangan-kamu';const s=randomBytes(16);console.log('scrypt$'+s.toString('base64')+'$'+scryptSync(t,s,32).toString('base64'))"
```
Pemilik berbagi *token asli* kepada operator; halaman `/register` menerima token itu.

## Output & State
- **Whiteboard** & **Dashboard** = computed dari store (re-derive tiap render, <2 detik).
- **Invoice 2 rangkap** — klik baris status Selesai/Proses di riwayat → tombol Cetak.
  Layout print ada di `src/app/globals.css` (`@media print`): 2 lembar per A4, garis putus antar rangkap.