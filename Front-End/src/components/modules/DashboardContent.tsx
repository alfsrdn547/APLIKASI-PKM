"use client";

import { useMemo, useState } from "react";
import { useRPHStore } from "@/stores/useRPHStore";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { ExportModal } from "@/components/modules/ExportModal";
import { Button } from "@/components/ui/Button";
import { formatRp, formatShortDate } from "@/lib/utils";

// ─── Simple inline SVG bar chart (no dep) ───────────────────────────
function MiniBarChart({
  labels,
  values,
}: {
  labels: string[];
  values: number[];
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-40 items-end gap-2">
      {values.map((v, i) => (
        <div key={i} className="flex-1">
          <div className="flex h-36 items-end">
            <div
              className="w-full rounded-t bg-blue-500/80 transition-all hover:bg-blue-600"
              style={{ height: `${(v / max) * 100}%` }}
              title={`${labels[i]} — ${formatRp(v)}`}
            />
          </div>
          <p className="mt-1 truncate text-center text-[10px] text-gray-400">
            {labels[i]}
          </p>
        </div>
      ))}
    </div>
  );
}

export function DashboardContent() {
  const getDailySummaries = useRPHStore((s) => s.getDailySummaries);
  const [exportOpen, setExportOpen] = useState(false);

  const summaries = useMemo(() => getDailySummaries(), [getDailySummaries]);
  const last = summaries[summaries.length - 1];
  const prev = summaries[summaries.length - 2];

  const totals = useMemo(() => {
    const inflow = summaries.reduce((a, s) => a + s.totalChickenIn, 0);
    const dead = summaries.reduce((a, s) => a + s.totalChickenDead, 0);
    const revenue = summaries.reduce((a, s) => a + s.totalRevenue, 0);
    const expense = summaries.reduce((a, s) => a + s.totalExpenses, 0);
    return {
      inflow,
      dead,
      net: inflow - dead,
      revenue,
      expense,
      profit: revenue - expense,
      count: summaries.length,
    };
  }, [summaries]);

  const trendRev = prev?.totalRevenue
    ? Math.round(((totals.revenue - prev.totalRevenue) / prev.totalRevenue) * 100)
    : 0;

  const cols = [
    { key: "date", header: "Tanggal", render: (r: typeof summaries[0]) => formatShortDate(r.date) },
    { key: "net", header: "Net Produksi", render: (r: typeof summaries[0]) => `${r.netProduction.toLocaleString("id-ID")} ekor` },
    { key: "sales", header: "Transaksi", render: (r: typeof summaries[0]) => r.totalSales },
    { key: "revenue", header: "Omset", render: (r: typeof summaries[0]) => formatRp(r.totalRevenue) },
    { key: "expense", header: "Beban", render: (r: typeof summaries[0]) => formatRp(r.totalExpenses) },
    {
      key: "profit",
      header: "Laba",
      render: (r: typeof summaries[0]) => (
        <span className={r.profit >= 0 ? "text-green-600" : "text-red-600"}>
          {formatRp(r.profit)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Dashboard Rekapitulasi</h2>
          <p className="text-sm text-gray-500">
            Ringkasan harian penerimaan, penjualan & pengeluaran RPH (Modul 4)
          </p>
        </div>
        <Button
          onClick={() => setExportOpen(true)}
          icon={<span>📤</span>}
        >
          Ekspor Laporan
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Produksi"
          value={`${totals.net.toLocaleString("id-ID")} ekor`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7 7 7M5 19v-6h14v6" />
            </svg>
          }
        />
        <StatCard
          label="Total Omset"
          value={formatRp(totals.revenue)}
          trend={{ value: trendRev, isPositive: trendRev >= 0 }}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          }
        />
        <StatCard
          label="Total Beban"
          value={formatRp(totals.expense)}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Laba Bersih"
          value={formatRp(totals.profit)}
          className={totals.profit >= 0 ? "" : "border-red-200"}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3 3L22 4" transform="scale(1.1) translate(-1,-1)" />
            </svg>
          }
        />
      </div>

      {/* Chart */}
      <Card
        title="Tren Omset & Beban Harian"
        subtitle="7 hari terakhir (auto dari data)"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <MiniBarChart
            labels={summaries.slice(-7).map((s) => formatShortDate(s.date).slice(0, 6))}
            values={summaries.slice(-7).map((s) => s.totalRevenue)}
          />
          <MiniBarChart
            labels={summaries.slice(-7).map((s) => formatShortDate(s.date).slice(0, 6))}
            values={summaries.slice(-7).map((s) => s.totalExpenses)}
          />
        </div>
      </Card>

      {/* Table recap */}
      <Card
        title="Rekapitulasi Harian"
        subtitle={`${totals.count} hari tercatat`}
      >
        <Table columns={cols} data={[...summaries].reverse()} emptyMessage="Belum ada data" />
      </Card>

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}