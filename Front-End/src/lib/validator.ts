import { ApiError } from "./apiResponse";

// ─── Validasi server-side (mirror Back-End/Validator.php) ─────────────

/** Gagal jika date ada di masa depan (format YYYY-MM-DD wajib). */
export function assertNotFuture(date: unknown): void {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError("VALIDATION_ERROR", "Tanggal wajib format YYYY-MM-DD", { date: "Format salah" }, 400);
  }
  if (date > new Date().toISOString().slice(0, 10)) {
    throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { date: "Tanggal tidak boleh di masa depan" }, 400);
  }
}

export const PAY_STATUSES = ["lunas", "belum_lunas"] as const;
export const PICKUP_STATUSES = ["sudah_diambil", "belum_diambil"] as const;
export const ORDER_STATUSES = ["pending", "processing", "completed", "cancelled"] as const;
export const EXPENSE_CATEGORIES = ["es_batu", "biaya_angkut", "pakan", "operasional_alat", "lainnya"] as const;
export const EXPENSE_DIRECTIONS = ["keluar", "masuk"] as const;
export const EXPENSE_SOURCES = ["kas", "bank", "lainnya"] as const;

export function isOneOf<T extends readonly string[]>(arr: T, v: unknown): v is T[number] {
  return typeof v === "string" && (arr as readonly string[]).includes(v);
}

// ─── Cek stok sales (manual butchery = sumber) ────────────────────────
interface SaleStockItem {
  productCode: string;
  quantity: number;
}
interface Agg {
  [code: string]: number;
}

export async function checkSaleStock(
  supabase: any,
  orderDate: string,
  items: SaleStockItem[]
): Promise<Record<string, string> | null> {
  const [{ data: cuts }, { data: sales }] = await Promise.all([
    supabase.from("butchery").select("*").order("date", { ascending: true }),
    supabase.from("sales").select("*").order("date", { ascending: true }),
  ]);

  const add = (m: Agg, k: string, v: number) => { m[k] = (m[k] || 0) + v; };
  const prevCut: Agg = {}, dayCut: Agg = {}, prevSold: Agg = {}, daySold: Agg = {};

  for (const c of cuts ?? []) {
    const b = c.date < orderDate ? prevCut : c.date === orderDate ? dayCut : null;
    if (!b) continue;
    for (const p of c.parts ?? []) add(b, p.productCode, p.qtyKg);
  }
  for (const s of sales ?? []) {
    const b = s.date < orderDate ? prevSold : s.date === orderDate ? daySold : null;
    if (!b) continue;
    for (const it of s.items ?? []) add(b, it.productCode, it.quantity);
  }

  const errs: Record<string, string> = {};
  for (const it of items) {
    const code = it.productCode;
    const opening = Math.max(0, (prevCut[code] || 0) - (prevSold[code] || 0));
    const available = Math.max(0, opening + (dayCut[code] || 0) - (daySold[code] || 0));
    if (it.quantity > available) {
      errs[code] = `Stok tersedia ${available} kg, diminta ${it.quantity} kg`;
    }
  }
  return Object.keys(errs).length ? errs : null;
}