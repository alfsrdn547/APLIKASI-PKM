import { ApiError } from "./apiResponse";
import {
  EXPENSE_CATEGORIES as EXPENSE_CATEGORY_LIST,
  EXPENSE_DIRECTIONS as EXPENSE_DIRECTION_LIST,
  EXPENSE_SOURCES as EXPENSE_SOURCE_LIST,
  ORDER_STATUSES as ORDER_STATUS_LIST,
  PAY_STATUSES as PAY_STATUS_LIST,
  PICKUP_STATUSES as PICKUP_STATUS_LIST,
} from "@/constants/products";

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

// Enum values diturunkan dari constants/products.ts (sumber tunggal) supaya
// validasi server & label UI nggak bisa berbeda.
const values = <T extends readonly { value: string }[]>(list: T) =>
  list.map((x) => x.value) as unknown as readonly string[];

export const PAY_STATUSES = values(PAY_STATUS_LIST);
export const PICKUP_STATUSES = values(PICKUP_STATUS_LIST);
export const ORDER_STATUSES = values(ORDER_STATUS_LIST);
export const EXPENSE_CATEGORIES = values(EXPENSE_CATEGORY_LIST);
export const EXPENSE_DIRECTIONS = values(EXPENSE_DIRECTION_LIST);
export const EXPENSE_SOURCES = values(EXPENSE_SOURCE_LIST);

export function isOneOf(arr: readonly string[], v: unknown): v is string {
  return typeof v === "string" && arr.includes(v);
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
    // WAJIB embed sales_items — tanpa ini `s.items` selalu undefined dan
    // stok terjual dihitung 0 → guard server gak pernah nolak oversell
    // (jalan lewat Impor Excel / curl tanpa cek client).
    supabase.from("sales").select("*,sales_items(*)").order("date", { ascending: true }),
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
    // `items` = fallback jsonb legacy sebelum normalisasi ke sales_items.
    for (const it of s.sales_items ?? s.items ?? []) add(b, it.productCode, it.quantity);
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