import { create } from "zustand";
import type { DailySummaryRow } from "@/types/dashboard";
import type {
  IncomingRecord,
  SalesOrder,
  ExpenseRecord,
  WhiteboardEntry,
  OrderStatus,
  ExpenseCategory,
  ExpenseDirection,
  ExpenseSourceFund,
  ButcheryRecord,
  PayStatus,
  PickupStatus,
} from "@/types";
import { PRODUCTS, DEFAULT_PRICES } from "@/constants/products";
import { api } from "@/lib/api";

// ─── Row ↔ column mapping (camelCase TS ↔ snake_case DB) ─────────────
interface IncomingRow {
  id: string;
  date: string;
  chicken_in: number;
  chicken_dead: number;
  chicken_broken: number;
  nopol: string;
  tonase_kg: number;
  harga_per_kg: number;
  total_harga: number;
  kasbon: number;
  notes: string;
  created_at: string;
}
const mapIncoming = (r: IncomingRow): IncomingRecord => ({
  id: r.id, date: r.date.slice(0, 10),
  chickenIn: r.chicken_in, chickenDead: r.chicken_dead, chickenBroken: r.chicken_broken,
  nopol: r.nopol ?? "", tonase: r.tonase_kg ?? 0, hargaPerKg: r.harga_per_kg ?? 0,
  totalHarga: r.total_harga ?? 0, kasbon: r.kasbon ?? 0,
  notes: r.notes, createdAt: r.created_at,
});
const toIncomingRow = (r: Omit<IncomingRecord, "id" | "createdAt">) => ({
  date: r.date, chicken_in: r.chickenIn, chicken_dead: r.chickenDead,
  chicken_broken: r.chickenBroken, nopol: r.nopol, tonase_kg: r.tonase,
  harga_per_kg: r.hargaPerKg, total_harga: r.totalHarga, kasbon: r.kasbon,
  notes: r.notes,
});

interface SalesItemRow {
  id: string; sales_id: string; product_code: string; product_name: string;
  quantity: number; unit_price: number; subtotal: number; created_at: string;
}

interface SalesRow {
  id: string; date: string; customer_name: string; customer_phone: string;
  total_amount: number; status: string; notes: string; created_at: string;
  pay_status: string; pickup_status: string; paid_amount: number;
  sales_items?: SalesItemRow[];
}

const mapSales = (r: SalesRow): SalesOrder => {
  const items = (r.sales_items ?? []).map((si) => {
    const product = PRODUCTS.find((p) => p.code === si.product_code);
    return {
      productCode: si.product_code,
      productName: si.product_name || product?.name || si.product_code,
      quantity: si.quantity,
      unit: (product?.unit ?? "kg") as "kg" | "ekor",
      unitPrice: si.unit_price,
      subtotal: si.subtotal,
    };
  });
  return {
    id: r.id, date: r.date.slice(0, 10), customerName: r.customer_name,
    customerPhone: r.customer_phone, items, totalAmount: r.total_amount,
    status: r.status as OrderStatus,
    payStatus: (r.pay_status as PayStatus) || "belum_lunas",
    pickupStatus: (r.pickup_status as PickupStatus) || "belum_diambil",
    paidAmount: r.paid_amount || 0,
    notes: r.notes, createdAt: r.created_at,
  };
};

const toSalesRow = (r: Omit<SalesOrder, "id" | "createdAt" | "totalAmount" | "items">) => ({
  date: r.date, customer_name: r.customerName, customer_phone: r.customerPhone,
  total_amount: 0, status: r.status, notes: r.notes,
  pay_status: r.payStatus, pickup_status: r.pickupStatus, paid_amount: r.paidAmount,
});

interface ExpenseRow {
  id: string; date: string; category: string; direction: string;
  source_fund: string; description: string; amount: number; created_at: string;
}
const mapExpense = (r: ExpenseRow): ExpenseRecord => ({
  id: r.id, date: r.date.slice(0, 10), category: r.category as ExpenseCategory,
  direction: (r.direction as ExpenseDirection) || "keluar",
  sourceFund: (r.source_fund as ExpenseSourceFund) || "kas",
  description: r.description, amount: r.amount, createdAt: r.created_at,
});
const toExpenseRow = (r: Omit<ExpenseRecord, "id" | "createdAt">) => ({
  date: r.date, category: r.category, direction: r.direction,
  source_fund: r.sourceFund, description: r.description, amount: r.amount,
});

interface ButcheryRow {
  id: string; date: string; incoming_id: string | null;
  chicken_count: number; parts: ButcheryRecord["parts"];
  notes: string; created_at: string;
}
const mapButchery = (r: ButcheryRow): ButcheryRecord => ({
  id: r.id, date: r.date.slice(0, 10), incomingId: r.incoming_id,
  chickenCount: r.chicken_count, parts: r.parts, notes: r.notes, createdAt: r.created_at,
});
const toButcheryRow = (r: Omit<ButcheryRecord, "id" | "createdAt">) => ({
  date: r.date, incoming_id: r.incomingId, chicken_count: r.chickenCount,
  parts: r.parts, notes: r.notes,
});

// ─── Store shape ─────────────────────────────────────────────────────
interface RPHState {
  incoming: IncomingRecord[];
  sales: SalesOrder[];
  expenses: ExpenseRecord[];
  butchery: ButcheryRecord[];
  loading: boolean;
  error: string | null;

  // init — fetch semua data sekali
  fetchAll: () => Promise<void>;

  // Modul 1 actions
  addIncoming: (rec: Omit<IncomingRecord, "id" | "createdAt">) => Promise<void>;

  // Modul 2 — Pemotongan
  addButchery: (rec: Omit<ButcheryRecord, "id" | "createdAt">) => Promise<void>;
  removeButchery: (id: string) => Promise<void>;

  // Modul 2 — computed
  getWhiteboard: (date: string) => WhiteboardEntry[];

  // Modul 3 — Sales
  addSalesOrder: (order: Omit<SalesOrder, "id" | "createdAt" | "totalAmount">) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  updateOrderPayment: (id: string, patch: {
    payStatus?: PayStatus;
    pickupStatus?: PickupStatus;
    paidAmount?: number;
  }) => Promise<void>;

  // Modul 3 — Expenses
  addExpense: (rec: Omit<ExpenseRecord, "id" | "createdAt">) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;

  // Modul 4 — computed
  getDailySummaries: () => DailySummaryRow[];
  getStockForDate: (productCode: string, date: string) => StockInfo;
}

// ─── Computed types ──────────────────────────────────────────────────
interface StockInfo {
  opening: number;
  incoming: number;
  outgoing: number;
  closing: number;
}

// ─── Store ───────────────────────────────────────────────────────────
export const useRPHStore = create<RPHState>((set, get) => ({
  incoming: [],
  sales: [],
  expenses: [],
  butchery: [],
  loading: false,
  error: null,

  // ── Init: load semua data ────────────────────────────────────────
  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      const [inc, sal, exp, but] = await Promise.all([
        api.get<any[]>("/incoming"),
        api.get<any[]>("/sales"),
        api.get<any[]>("/expenses"),
        api.get<any[]>("/butchery"),
      ]);
      set({
        incoming: (inc as unknown as IncomingRow[]).map(mapIncoming),
        sales: (sal as unknown as SalesRow[]).map(mapSales),
        expenses: (exp as unknown as ExpenseRow[]).map(mapExpense),
        butchery: (but as unknown as ButcheryRow[]).map(mapButchery),
        loading: false,
      });
    } catch (e: any) {
      set({ loading: false, error: e?.message ?? "Gagal memuat data" });
    }
  },

  // ── Modul 1: Penerimaan ──────────────────────────────────────────
  addIncoming: async (rec) => {
    const inserted = await api.post<IncomingRow>("/incoming", toIncomingRow(rec));
    set((s) => ({ incoming: [...s.incoming, mapIncoming(inserted)] }));
  },

  // ── Modul 2: Pemotongan ──────────────────────────────────────────
  addButchery: async (rec) => {
    const inserted = await api.post<ButcheryRow>("/butchery", toButcheryRow(rec));
    set((s) => ({ butchery: [...s.butchery, mapButchery(inserted)] }));
  },

  removeButchery: async (id) => {
    await api.delete(`/butchery/${id}`);
    set((s) => ({ butchery: s.butchery.filter((b) => b.id !== id) }));
  },

  // ── Modul 2: Papan Tulis ─────────────────────────────────────────
  getWhiteboard: (date: string): WhiteboardEntry[] => {
    const { butchery, sales } = get();
    const prevCut: Record<string, number> = {};
    const dayCut: Record<string, number> = {};
    const prevSold: Record<string, number> = {};
    const daySold: Record<string, number> = {};
    const add = (m: Record<string, number>, k: string, v: number) => {
      m[k] = (m[k] || 0) + v;
    };

    butchery.forEach((b) => {
      const bucket = b.date < date ? prevCut : b.date === date ? dayCut : null;
      if (bucket) b.parts.forEach((p) => add(bucket, p.productCode, p.qtyKg));
    });
    sales.forEach((s) => {
      const bucket = s.date < date ? prevSold : s.date === date ? daySold : null;
      if (bucket) s.items.forEach((it) => add(bucket, it.productCode, it.quantity));
    });

    const r1 = (n: number) => Math.round(n * 10) / 10;

    return PRODUCTS.filter((p) => p.unit === "kg").map((product) => {
      const incoming = r1(dayCut[product.code] || 0);
      const outgoing = r1(daySold[product.code] || 0);
      const opening = Math.max(
        0,
        r1((prevCut[product.code] || 0) - (prevSold[product.code] || 0))
      );
      const closing = Math.max(0, r1(opening + incoming - outgoing));

      return {
        productCode: product.code,
        openingStock: opening,
        incoming,
        outgoing,
        closingStock: closing,
        unitPrice: DEFAULT_PRICES[product.code] || 0,
      };
    });
  },

  // ── Modul 3: Penjualan ──────────────────────────────────────────
  addSalesOrder: async (order) => {
    // Server: insert sales + sales_items, hitung total, stock check
    const full = await api.post<SalesRow>("/sales", {
      date: order.date,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      notes: order.notes,
      status: order.status,
      payStatus: order.payStatus,
      pickupStatus: order.pickupStatus,
      paidAmount: order.paidAmount,
      items: order.items.map((it) => ({
        productCode: it.productCode,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })),
    });
    set((s) => ({ sales: [...s.sales, mapSales(full)] }));
  },

  updateOrderStatus: async (id, status) => {
    const updated = await api.patch<SalesRow>(`/sales/${id}`, { status });
    set((s) => ({
      sales: s.sales.map((o) => (o.id === id ? { ...o, ...mapSales(updated) } : o)),
    }));
  },

  updateOrderPayment: async (id, patch) => {
    const updated = await api.patch<SalesRow>(`/sales/${id}`, {
      payStatus: patch.payStatus,
      pickupStatus: patch.pickupStatus,
      paidAmount: patch.paidAmount,
    });
    set((s) => ({
      sales: s.sales.map((o) => (o.id === id ? { ...o, ...mapSales(updated) } : o)),
    }));
  },

  // ── Modul 3: Pengeluaran ────────────────────────────────────────
  addExpense: async (rec) => {
    const inserted = await api.post<ExpenseRow>("/expenses", {
      date: rec.date,
      category: rec.category,
      direction: rec.direction,
      sourceFund: rec.sourceFund,
      description: rec.description,
      amount: rec.amount,
    });
    set((s) => ({ expenses: [...s.expenses, mapExpense(inserted)] }));
  },

  removeExpense: async (id) => {
    await api.delete(`/expenses/${id}`);
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
  },

  // ── Modul 4: Dashboard computed ──────────────────────────────────
  getDailySummaries: (): DailySummaryRow[] => {
    const { incoming, sales, expenses } = get();
    const dates = Array.from(
      new Set([
        ...incoming.map((i) => i.date),
        ...sales.map((s) => s.date),
        ...expenses.map((e) => e.date),
      ])
    ).sort();

    return dates.map((date) => {
      const dI = incoming.filter((i) => i.date === date);
      const dS = sales.filter((s) => s.date === date);
      const dE = expenses.filter((e) => e.date === date);

      const totalChickenIn = dI.reduce((a, i) => a + i.chickenIn, 0);
      const totalChickenDead = dI.reduce((a, i) => a + i.chickenDead, 0);
      const totalRevenue = dS.reduce((a, s) => a + s.totalAmount, 0);
      const totalExpenses = dE.reduce((a, e) => a + e.amount, 0);

      return {
        date,
        totalChickenIn,
        totalChickenDead,
        netProduction: totalChickenIn - totalChickenDead,
        totalSales: dS.length,
        totalRevenue,
        totalExpenses,
        profit: totalRevenue - totalExpenses,
      };
    });
  },

  getStockForDate: (productCode: string, date: string): StockInfo => {
    const wb = get().getWhiteboard(date);
    const entry = wb.find((e) => e.productCode === productCode);
    return entry
      ? {
          opening: entry.openingStock,
          incoming: entry.incoming,
          outgoing: entry.outgoing,
          closing: entry.closingStock,
        }
      : { opening: 0, incoming: 0, outgoing: 0, closing: 0 };
  },
}));