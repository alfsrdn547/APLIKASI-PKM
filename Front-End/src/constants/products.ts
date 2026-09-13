import type { Product } from "@/types";

// ─── Kode Barang RPH ────────────────────────────────────────────────
// PC=Potong Bersih, KRKS=Karkas, BLD=Bulat, DAD=Dada, PAH=Paha,
// SAY=Sayap, FIL=Fillet, GLG=Gelonggong, CKR=Ceker, KPL=Kepala,
// ATI=Ati/Hati, AMP=Ampela
export const PRODUCTS: Product[] = [
  { code: "PC",  name: "Ayam Potong Bersih", unit: "kg", category: "karkas" },
  { code: "KRKS", name: "Karkas Utuh",        unit: "kg", category: "karkas" },
  { code: "BLD",  name: "Bulat Utuh",         unit: "kg", category: "karkas" },
  { code: "DAD",  name: "Dada Fillet",         unit: "kg", category: "potongan" },
  { code: "PAH",  name: "Paha Atas + Bawah",   unit: "kg", category: "potongan" },
  { code: "SAY",  name: "Sayap Utuh",          unit: "kg", category: "potongan" },
  { code: "FIL",  name: "Fillet Dada",         unit: "kg", category: "fillet" },
  { code: "GLG",  name: "Gelonggong / Back",   unit: "kg", category: "lainnya" },
  { code: "CKR",  name: "Ceker / Feet",        unit: "kg", category: "lainnya" },
  { code: "KPL",  name: "Kepala",              unit: "ekor", category: "organ" },
  { code: "ATI",  name: "Ati / Hati",          unit: "kg", category: "organ" },
  { code: "AMP",  name: "Ampela",              unit: "kg", category: "organ" },
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

// ─── Status Pesanan ──────────────────────────────────────────────────
export const ORDER_STATUSES = [
  { value: "pending",    label: "Pending",    color: "text-yellow-600 bg-yellow-50" },
  { value: "processing", label: "Proses",     color: "text-blue-600 bg-blue-50" },
  { value: "completed",  label: "Selesai",    color: "text-green-600 bg-green-50" },
  { value: "cancelled",  label: "Dibatalkan",  color: "text-red-600 bg-red-50" },
] as const;

// ─── Harga Default (Rp per kg) ───────────────────────────────────────
export const DEFAULT_PRICES: Record<string, number> = {
  PC:   38000,
  KRKS: 36000,
  BLD:  37000,
  DAD:  45000,
  PAH:  40000,
  SAY:  25000,
  FIL:  55000,
  GLG:  15000,
  CKR:  20000,
  KPL:  10000,
  ATI:  25000,
  AMP:  22000,
};

// ─── Bobot & distribusi per karkas (utk prefill form pemotongan) ─────
export const AVG_WEIGHT_PER_EKOR = 1.8;

export const BUTCHERY_DISTRIBUTION: Record<string, number> = {
  PC:   0.55,
  KRKS: 0.55,
  BLD:  0.55,
  DAD:  0.18,
  PAH:  0.15,
  SAY:  0.08,
  FIL:  0.06,
  GLG:  0.10,
  CKR:  0.04,
  KPL:  1.00,
  ATI:  0.02,
  AMP:  0.015,
};
