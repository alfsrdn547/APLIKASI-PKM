# APLIKASI-PKM

Digitalisasi pencatatan harian **Rumah Potong Hewan (RPH)**.

## Alur User

### 1. Operasional harian

```
PENERIMAAN (/penerimaan)
   ayam masuk, mati, cacat, tonase, harga
        ↓
PEMOTONGAN (/pemotongan)
   potong jadi parts (PC, BLD, SAYAP-B, …)
        ↓
PAPAN TULIS (/papan-tulis)
   stok = opening + potong − jual
        ↓
PENJUALAN (/penjualan)
   items, cek stok, bayar + ambil
        ↓
PENGELUARAN (/pengeluaran)
   biaya_es_batu, biaya_angkut, pakan, operasional_alat, lainnya
        ↓
DASHBOARD (/)
   rekap harian, export CSV/JSON/cetak
```

Tiap modul punya form input + tabel riwayat. Angka uang & stok dihitung **server-side** — client nggak dipercaya.

### 2. Akun & login

```
[SEKALI]  npm run admin admin@rph.sch.id "rahasia-kuat"
             → buat akun pemilik
        ↓
[LOGIN]   /login → email + password
        ↓
   masuk ke aplikasi
```

| Peran | Email dibuat | Hak akses |
|---|---|---|
| **Pemilik** | script `npm run admin` | baca semua data, kelola akun di `/operator` |
| **Operator** | pemilik, dari `/operator` | baca **+ tulis** semua data |

Nggak ada halaman daftar — operator nggak daftar sendiri. Pemilik yang bikin akunnya.

Sesi: cookie httpOnly, berlaku 12 jam, tanpa refresh. Logout dari tombol **Keluar** di topbar.

### 3. Kelola akun (pemilik saja)

`/operator` — bikin operator (nama + email + password), aktifkan/nonaktifkan, reset password. Owner yang baru dibuat **nggak bisa diubah dari halaman ini** (sengaja, supaya pemilik nggak saling nonaktifkan).
