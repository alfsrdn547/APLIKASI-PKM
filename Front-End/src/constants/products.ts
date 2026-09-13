import type { Product } from "@/types";

// ─── Kode Barang RPH (17, sesuai PRD Modul 2) ────────────────────────
// Ayam Utuh: PC, KRKS. Daging & Parting: BLD, BLD-K, BLP, BLP-K,
// PAHA-P/U/A, SAYAP-B/R. Sampingan/Jeroan: CKR, KPL, KULIT, USUS, ATI, TULANG.
export const PRODUCTS: Product[] = [
  { code: "PC",     name: "Ayam Utuh Parting/Potong", unit: "kg", category: "ayam_utuh" },
  { code: "KRKS",   name: "Karkas Utuh",              unit: "kg", category: "ayam_utuh" },
  { code: "BLD",    name: "Boneless Dada",            unit: "kg", category: "daging" },
  { code: "BLD-K",  name: "Boneless Dada Kulit",      unit: "kg", category: "daging" },
  { code: "BLP",    name: "Boneless Paha",            unit: "kg", category: "daging" },
  { code: "BLP-K",  name: "Boneless Paha Kulit",      unit: "kg", category: "daging" },
  { code: "PAHA-P", name: "Paha (P)",                 unit: "kg", category: "daging" },
  { code: "PAHA-U", name: "Paha (U)",                 unit: "kg", category: "daging" },
  { code: "PAHA-A", name: "Paha (A)",                 unit: "kg", category: "daging" },
  { code: "SAYAP-B", name: "Sayap (B)",               unit: "kg", category: "daging" },
  { code: "SAYAP-R", name: "Sayap (R)",               unit: "kg", category: "daging" },
  { code: "CKR",    name: "Cakar",                    unit: "kg", category: "sampingan" },
  { code: "KPL",    name: "Kepala",                   unit: "ekor", category: "sampingan" },
  { code: "KULIT",  name: "Kulit",                    unit: "kg", category: "sampingan" },
  { code: "USUS",   name: "Usus",                     unit: "kg", category: "sampingan" },
  { code: "ATI",    name: "Ati",                      unit: "kg", category: "sampingan" },
  { code: "TULANG", name: "Tulang",                   unit: "kg", category: "sampingan" },
];

export const PRODUCT_MAP: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.code, p])
);

// ─── Kategori Pengeluaran ────────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  { value: "es_batu",         label: "Es Batu" },
  { value: "biaya_angkut",    label: "Biaya Angkut" },
  { value: "pakan",           label: "Pakan (Temporary)" },
  { value: "operasional_alat", label: "Operasional Alat" },
  { value: "lainnya",         label: "Lainnya" },
] as const;

// ─── Arah arus & sumber uang pengeluaran (PRD Modul 4) ───────────────
export const EXPENSE_DIRECTIONS = [
  { value: "keluar", label: "Keluar" },
  { value: "masuk",  label: "Masuk" },
] as const;

export const EXPENSE_SOURCES = [
  { value: "kas",  label: "Kas" },
  { value: "bank", label: "Bank" },
  { value: "lainnya", label: "Lainnya" },
] as const;

// ─── Status Pesanan ──────────────────────────────────────────────────
export const ORDER_STATUSES = [
  { value: "pending",    label: "Pending",    color: "text-yellow-600 bg-yellow-50" },
  { value: "processing", label: "Proses",     color: "text-blue-600 bg-blue-50" },
  { value: "completed",  label: "Selesai",    color: "text-green-600 bg-green-50" },
  { value: "cancelled",  label: "Dibatalkan",  color: "text-red-600 bg-red-50" },
] as const;

// ─── Status Pembayaran (PRD Modul 3) ─────────────────────────────────
export const PAY_STATUSES = [
  { value: "lunas",       label: "Lunas",       color: "text-green-600 bg-green-50" },
  { value: "belum_lunas", label: "Belum Lunas", color: "text-amber-600 bg-amber-50" },
] as const;

export const PICKUP_STATUSES = [
  { value: "sudah_diambil",    label: "Sudah Diambil",   color: "text-green-600 bg-green-50" },
  { value: "belum_diambil",    label: "Belum Diambil",   color: "text-amber-600 bg-amber-50" },
] as const;

// ─── Harga Default (Rp per kg) ───────────────────────────────────────
export const DEFAULT_PRICES: Record<string, number> = {
  PC:     38000,
  KRKS:   36000,
  BLD:    45000,
  "BLD-K": 46000,
  BLP:    40000,
  "BLP-K": 41000,
  "PAHA-P": 40000,
  "PAHA-U": 39000,
  "PAHA-A": 38000,
  "SAYAP-B": 25000,
  "SAYAP-R": 24000,
  CKR:    20000,
  KPL:    10000,
  KULIT:  15000,
  USUS:   12000,
  ATI:    25000,
  TULANG: 8000,
};

// ─── Bobot & distribusi per karkas (utk prefill form pemotongan) ─────
export const AVG_WEIGHT_PER_EKOR = 1.8;

export const BUTCHERY_DISTRIBUTION: Record<string, number> = {
  PC:     0.55,
  KRKS:   0.55,
  BLD:    0.18,
  "BLD-K": 0.15,
  BLP:    0.15,
  "BLP-K": 0.12,
  "PAHA-P": 0.06,
  "PAHA-U": 0.05,
  "PAHA-A": 0.05,
  "SAYAP-B": 0.04,
  "SAYAP-R": 0.04,
  CKR:    0.04,
  KPL:    1.00,
  KULIT:  0.06,
  USUS:   0.03,
  ATI:    0.02,
  TULANG: 0.05,
};