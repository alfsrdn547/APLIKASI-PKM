import type {
  IncomingRecord,
  SalesOrder,
  ExpenseRecord,
  WhiteboardEntry,
} from "@/types";
import { PRODUCTS, DEFAULT_PRICES } from "@/constants/products";

// ─── Simulasi data 1 minggu terakhir ─────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ─── Penerimaan (Modul 1) ────────────────────────────────────────────
export const MOCK_INCOMING: IncomingRecord[] = [
  {
    id: "inc_001",
    date: daysAgo(6),
    chickenIn: 500,
    chickenDead: 12,
    chickenBroken: 5,
    notes: "Pagi - supplier Pak Budi",
    createdAt: new Date().toISOString(),
  },
  {
    id: "inc_002",
    date: daysAgo(5),
    chickenIn: 480,
    chickenDead: 8,
    chickenBroken: 3,
    notes: "Pagi - supplier Pak Joko",
    createdAt: new Date().toISOString(),
  },
  {
    id: "inc_003",
    date: daysAgo(4),
    chickenIn: 520,
    chickenDead: 15,
    chickenBroken: 7,
    notes: "Pagi - supplier Pak Budi",
    createdAt: new Date().toISOString(),
  },
  {
    id: "inc_004",
    date: daysAgo(3),
    chickenIn: 450,
    chickenDead: 10,
    chickenBroken: 2,
    notes: "Pagi - supplier Pak Joko",
    createdAt: new Date().toISOString(),
  },
  {
    id: "inc_005",
    date: daysAgo(2),
    chickenIn: 510,
    chickenDead: 11,
    chickenBroken: 4,
    notes: "Pagi - supplier Pak Budi",
    createdAt: new Date().toISOString(),
  },
  {
    id: "inc_006",
    date: daysAgo(1),
    chickenIn: 490,
    chickenDead: 9,
    chickenBroken: 3,
    notes: "Pagi - supplier Pak Hendra",
    createdAt: new Date().toISOString(),
  },
];

// ─── Penjualan (Modul 3) ─────────────────────────────────────────────
export const MOCK_SALES: SalesOrder[] = [
  {
    id: "ord_001",
    date: daysAgo(6),
    customerName: "Toko Ayam Sejahtera",
    customerPhone: "0812-3456-7890",
    items: [
      { productCode: "KRKS", productName: "Karkas Utuh", quantity: 120, unit: "kg", unitPrice: 36000, subtotal: 4320000 },
      { productCode: "DAD",  productName: "Dada Fillet",  quantity: 50,  unit: "kg", unitPrice: 45000, subtotal: 2250000 },
      { productCode: "PAH",  productName: "Paha",          quantity: 60,  unit: "kg", unitPrice: 40000, subtotal: 2400000 },
    ],
    totalAmount: 8970000,
    status: "completed",
    notes: "Antar jam 06.00",
    createdAt: new Date().toISOString(),
  },
  {
    id: "ord_002",
    date: daysAgo(5),
    customerName: "Rumah Makan Padang Barokah",
    customerPhone: "0856-1234-5678",
    items: [
      { productCode: "PC",   productName: "Potong Bersih", quantity: 100, unit: "kg", unitPrice: 38000, subtotal: 3800000 },
      { productCode: "FIL",  productName: "Fillet Dada",   quantity: 30,  unit: "kg", unitPrice: 55000, subtotal: 1650000 },
    ],
    totalAmount: 5450000,
    status: "completed",
    notes: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "ord_003",
    date: daysAgo(4),
    customerName: "Catering Bu Sari",
    customerPhone: "0878-9012-3456",
    items: [
      { productCode: "KRKS", productName: "Karkas Utuh", quantity: 80,  unit: "kg", unitPrice: 36000, subtotal: 2880000 },
      { productCode: "SAY",  productName: "Sayap",       quantity: 40,  unit: "kg", unitPrice: 25000, subtotal: 1000000 },
      { productCode: "CKR",  productName: "Ceker",       quantity: 25,  unit: "kg", unitPrice: 20000, subtotal: 500000 },
    ],
    totalAmount: 4380000,
    status: "completed",
    notes: "Pesanan untuk acara",
    createdAt: new Date().toISOString(),
  },
  {
    id: "ord_004",
    date: daysAgo(3),
    customerName: "Toko Frozen Food Jaya",
    customerPhone: "0811-2233-4455",
    items: [
      { productCode: "BLD",  productName: "Bulat Utuh",    quantity: 150, unit: "kg", unitPrice: 37000, subtotal: 5550000 },
      { productCode: "DAD",  productName: "Dada Fillet",   quantity: 70,  unit: "kg", unitPrice: 45000, subtotal: 3150000 },
      { productCode: "ATI",  productName: "Ati/Hati",      quantity: 20,  unit: "kg", unitPrice: 25000, subtotal: 500000 },
    ],
    totalAmount: 9200000,
    status: "completed",
    notes: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "ord_005",
    date: daysAgo(2),
    customerName: "Restoran Ayam Geprek Mas Toni",
    customerPhone: "0834-5678-9012",
    items: [
      { productCode: "PC",   productName: "Potong Bersih", quantity: 200, unit: "kg", unitPrice: 38000, subtotal: 7600000 },
      { productCode: "PAH",  productName: "Paha",          quantity: 80,  unit: "kg", unitPrice: 40000, subtotal: 3200000 },
    ],
    totalAmount: 10800000,
    status: "completed",
    notes: "Grosir mingguan",
    createdAt: new Date().toISOString(),
  },
  {
    id: "ord_006",
    date: daysAgo(1),
    customerName: "Warung Bu Rini",
    customerPhone: "0856-7890-1234",
    items: [
      { productCode: "KRKS", productName: "Karkas Utuh", quantity: 50, unit: "kg", unitPrice: 36000, subtotal: 1800000 },
    ],
    totalAmount: 1800000,
    status: "processing",
    notes: "",
    createdAt: new Date().toISOString(),
  },
];

// ─── Pengeluaran (Modul 3) ───────────────────────────────────────────
export const MOCK_EXPENSES: ExpenseRecord[] = [
  { id: "exp_001", date: daysAgo(6), category: "es_batu",          description: "Es batu 50kg",       amount: 150000, createdAt: new Date().toISOString() },
  { id: "exp_002", date: daysAgo(6), category: "biaya_angkut",     description: "Ongkir dari supplier", amount: 200000, createdAt: new Date().toISOString() },
  { id: "exp_003", date: daysAgo(6), category: "operasional_alat", description: "Pisau baru + sarung tangan", amount: 85000, createdAt: new Date().toISOString() },
  { id: "exp_004", date: daysAgo(5), category: "es_batu",          description: "Es batu 50kg",       amount: 150000, createdAt: new Date().toISOString() },
  { id: "exp_005", date: daysAgo(5), category: "biaya_angkut",     description: "Ongkir dari supplier", amount: 200000, createdAt: new Date().toISOString() },
  { id: "exp_006", date: daysAgo(4), category: "es_batu",          description: "Es batu 50kg",       amount: 150000, createdAt: new Date().toISOString() },
  { id: "exp_007", date: daysAgo(4), category: "pakan",            description: "Pakan ayam sementara", amount: 75000, createdAt: new Date().toISOString() },
  { id: "exp_008", date: daysAgo(3), category: "es_batu",          description: "Es batu 50kg",       amount: 150000, createdAt: new Date().toISOString() },
  { id: "exp_009", date: daysAgo(2), category: "es_batu",          description: "Es batu 60kg",       amount: 180000, createdAt: new Date().toISOString() },
  { id: "exp_010", date: daysAgo(2), category: "operasional_alat", description: "Servis mesin",       amount: 120000, createdAt: new Date().toISOString() },
  { id: "exp_011", date: daysAgo(1), category: "es_batu",          description: "Es batu 50kg",       amount: 150000, createdAt: new Date().toISOString() },
  { id: "exp_012", date: daysAgo(1), category: "biaya_angkut",     description: "Ongkir dari supplier", amount: 200000, createdAt: new Date().toISOString() },
];

// ─── Papan Tulis (Modul 2) — computed dari data lain ─────────────────
// Bobot rata-rata per ekor: ~1.8 kg setelah potong bersih
const AVG_WEIGHT_PER_EKOR = 1.8;

export function computeWhiteboard(
  incoming: IncomingRecord[],
  sales: SalesOrder[],
  date: string
): WhiteboardEntry[] {
  // Hitung total produksi bersih untuk tanggal ini
  const dayIncoming = incoming.filter((i) => i.date === date);
  const netChickens = dayIncoming.reduce(
    (acc, i) => acc + i.chickenIn - i.chickenDead,
    0
  );
  const totalProducedKg = netChickens * AVG_WEIGHT_PER_EKOR;

  // Hitung penjualan per kode barang
  const daySales = sales.filter((s) => s.date === date);
  const soldByCode: Record<string, number> = {};
  daySales.forEach((order) =>
    order.items.forEach((item) => {
      soldByCode[item.productCode] =
        (soldByCode[item.productCode] || 0) + item.quantity;
    })
  );

  // Stok kemarin (simulasi: total produksi dari semua hari sebelumnya - total terjual)
  // Dalam real app ini dari DB. Simulasi sederhana:
  const prevDates = incoming
    .filter((i) => i.date < date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  const prevTotalIn = prevDates.reduce(
    (acc, i) => acc + i.chickenIn - i.chickenDead,
    0
  );
  const prevProduced = prevTotalIn * AVG_WEIGHT_PER_EKOR;

  const prevSales = sales.filter((s) => s.date < date);
  const prevSoldTotal = prevSales.reduce(
    (acc, order) =>
      acc + order.items.reduce((a, item) => a + item.quantity, 0),
    0
  );
  const prevSold = prevSoldTotal * 0.6; // distribusi ke karkas roughly

  return PRODUCTS.filter((p) => p.unit === "kg").map((product) => {
    const distribution = product.category === "karkas" ? 0.6
      : product.category === "potongan" ? 0.25
      : product.category === "fillet" ? 0.08
      : 0.07;

    const incomingQty = Math.round(totalProducedKg * distribution * 10) / 10;
    const outgoingQty = soldByCode[product.code] || 0;
    const opening = Math.round(prevProduced * distribution - prevSold * 0.3);
    const closing = Math.round((opening + incomingQty - outgoingQty) * 10) / 10;

    return {
      productCode: product.code,
      openingStock: Math.max(0, opening),
      incoming: Math.max(0, incomingQty),
      outgoing: Math.max(0, outgoingQty),
      closingStock: Math.max(0, closing),
      unitPrice: DEFAULT_PRICES[product.code] || 0,
    };
  });
}

// ─── Dashboard summary (Modul 4) ─────────────────────────────────────
export function getDailySummaries(
  incoming: IncomingRecord[],
  sales: SalesOrder[],
  expenses: ExpenseRecord[]
) {
  const dates = Array.from(new Set([...incoming.map(i => i.date), ...sales.map(s => s.date), ...expenses.map(e => e.date)])).sort();

  return dates.map((date) => {
    const dayInc = incoming.filter((i) => i.date === date);
    const daySale = sales.filter((s) => s.date === date);
    const dayExp = expenses.filter((e) => e.date === date);

    const totalChickenIn = dayInc.reduce((a, i) => a + i.chickenIn, 0);
    const totalChickenDead = dayInc.reduce((a, i) => a + i.chickenDead, 0);
    const netProduction = totalChickenIn - totalChickenDead;
    const totalRevenue = daySale.reduce((a, s) => a + s.totalAmount, 0);
    const totalExpenses = dayExp.reduce((a, e) => a + e.amount, 0);

    return {
      date,
      totalChickenIn,
      totalChickenDead,
      netProduction,
      totalSales: daySale.length,
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
    };
  });
}
