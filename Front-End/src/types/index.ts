// ─── Produk / Item ───────────────────────────────────────────────────
export interface Product {
  code: string;       // KRKS, PC, BLD, dll
  name: string;
  unit: "kg" | "ekor";
  category: ProductCategory;
}

export type ProductCategory =
  | "ayam_utuh"
  | "daging"
  | "sampingan";

// ─── Modul 1: Penerimaan / Stok Harian ────────────────────────────────
export interface IncomingRecord {
  id: string;
  date: string;           // YYYY-MM-DD
  chickenIn: number;      // ekor masuk (surat jalan)
  chickenDead: number;    // ekor mati / afkir
  chickenBroken: number;  // ekor afkir ringan (dipisah untuk tracing)
  nopol: string;          // no. polisi kendaraan
  tonase: number;         // berat masuk (kg)
  hargaPerKg: number;     // harga per kg
  totalHarga: number;     // total (auto: ekor × harga)
  kasbon: number;         // kasbon (opsional)
  notes: string;
  createdAt: string;
}

export interface DailyProduction {
  date: string;
  totalIn: number;
  totalDead: number;
  totalBroken: number;
  netProduction: number;  // totalIn - totalDead
}

// ─── Modul 2: Papan Tulis Digital ─────────────────────────────────────
export interface WhiteboardEntry {
  productCode: string;
  openingStock: number;
  incoming: number;       // hasil produksi bersih masuk hari ini
  outgoing: number;       // terjual hari ini
  closingStock: number;   // opening + incoming - outgoing
  unitPrice: number;      // Rp
}

// ─── Modul 3: Penjualan ───────────────────────────────────────────────
export type OrderStatus =
  | "pending"
  | "processing"
  | "completed"
  | "cancelled";

export type PayStatus = "lunas" | "belum_lunas";
export type PickupStatus = "sudah_diambil" | "belum_diambil";

export interface SalesItem {
  productCode: string;
  productName: string;
  quantity: number;
  unit: "kg" | "ekor";
  unitPrice: number;
  subtotal: number;
}

export interface SalesOrder {
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  items: SalesItem[];
  totalAmount: number;
  status: OrderStatus;
  payStatus: PayStatus;
  pickupStatus: PickupStatus;
  paidAmount: number;
  notes: string;
  createdAt: string;
}

export interface InvoicePrintOrder extends SalesOrder {
  // Alias utk komponen print yang butuh daily info (opsional)
}

// ─── Modul 3: Transaksi Pengeluaran ──────────────────────────────────
export type ExpenseCategory =
  | "es_batu"
  | "biaya_angkut"
  | "pakan"
  | "operasional_alat"
  | "lainnya";

export type ExpenseDirection = "keluar" | "masuk";
export type ExpenseSourceFund = "kas" | "bank" | "lainnya";

export interface ExpenseRecord {
  id: string;
  date: string;
  category: ExpenseCategory;
  direction: ExpenseDirection;      // arus uang: keluar / masuk
  sourceFund: ExpenseSourceFund;    // sumber uang
  description: string;
  amount: number;         // Rp
  createdAt: string;
}

// ─── Modul 4: Dashboard ──────────────────────────────────────────────
export interface DailySummary {
  date: string;
  totalChickenIn: number;
  totalChickenDead: number;
  netProduction: number;
  totalSales: number;     // jumlah transaksi
  totalRevenue: number;   // total omset
  totalExpenses: number;  // total pengeluaran
  profit: number;         // revenue - expenses
}

export interface MonthlySummary {
  month: string;          // YYYY-MM
  summaries: DailySummary[];
}

// ─── Modul 2: Pemotongan Manual ───────────────────────────────────────
export interface ButcheryPart {
  productCode: string;
  qtyKg: number;             // kg timbangan aktual
}

export interface ButcheryRecord {
  id: string;
  date: string;              // YYYY-MM-DD
  incomingId: string | null; // null = tanpa tautan batch
  chickenCount: number;      // ekor dipotong
  parts: ButcheryPart[];     // hanya qty > 0
  notes: string;
  createdAt: string;
}

// ─── Form Validation ─────────────────────────────────────────────────
export interface FormErrors {
  [field: string]: string;
}
