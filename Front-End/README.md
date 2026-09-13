# RPH — Sistem Pencatatan (Frontend)

Digitalisasi pencatatan harian Rumah Potong Hewan (RPH) sesuai PRD.
**Frontend-only:** state lokal Zustand + mock data. Backend belum dibutuhkan (validasi & kalkulasi stok berjalan real-time di browser).

## Stack
- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS** + **Zustand**

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

## Validasi yang Sudah Berjalan (tanpa backend)
- **Stok menolak minus** — qty penjualan > stok tersedia ⇒ error per-item.
- **Harga/Qty positif** — ditolak ≤ 0.
- **Tanggal tidak boleh masa depan** — input `date` dibatasi `max=today` + validasi ulang.
- **Ayam mati ≤ ayam masuk** — cross-field check di Modul 1.

## Output & State
- **Whiteboard** & **Dashboard** = computed dari store (re-derive tiap render, <2 detik).
- **Invoice 2 rangkap** — klik baris status Selesai/Proses di riwayat → tombol Cetak.
  Layout print ada di `src/app/globals.css` (`@media print`): 2 lembar per A4, garis putus antar rangkap.

## Menyambung Backend Nanti
Ganti action di `useRPHStore` dengan `fetch` ke API (`/api/...`), dan kompensasi mock-data dengan data server. Interface `types/` sudah siap dijadikan kontrak API.