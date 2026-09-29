// ─── Ringkasan harian untuk Dashboard / Ekspor ───────────────────────
export interface DailySummaryRow {
  date: string;
  totalChickenIn: number;
  totalChickenDead: number;
  netProduction: number;
  totalSales: number;
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
}