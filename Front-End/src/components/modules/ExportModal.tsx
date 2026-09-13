"use client";

import { useState } from "react";
import type { DailySummaryRow } from "@/types/dashboard";
import { useRPHStore } from "@/stores/useRPHStore";
import { Button } from "@/components/ui/Button";

// ─── Tipe CSRF: pastikan konsisten dengan store ─────────────────────
interface ExportModalProps {
  open: boolean;
  onClose: () => void;
}

interface ExportRow {
  tanggal: string;
  ayam_masuk: number;
  ayam_mati: number;
  produksi_bersih: number;
  jumlah_transaksi: number;
  omset: number;
  pengeluaran: number;
  laba: number;
}

export function ExportModal({ open, onClose }: ExportModalProps) {
  const getDailySummaries = useRPHStore((s) => s.getDailySummaries);
  const [format, setFormat] = useState<"csv" | "json" | "print">("csv");
  const [range, setRange] = useState<"7d" | "14d" | "30d">("7d");

  const summaries = getDailySummaries();
  const cutoff = (() => {
    const n = range === "7d" ? 7 : range === "14d" ? 14 : 30;
    return Date.now() - n * 24 * 60 * 60 * 1000;
  })();
  const filtered = summaries.filter((s) => new Date(s.date).getTime() >= cutoff);

  if (!open) return null;

  const rows: ExportRow[] = filtered.map((s) => ({
    tanggal: s.date,
    ayam_masuk: s.totalChickenIn,
    ayam_mati: s.totalChickenDead,
    produksi_bersih: s.netProduction,
    jumlah_transaksi: s.totalSales,
    omset: s.totalRevenue,
    pengeluaran: s.totalExpenses,
    laba: s.profit,
  }));

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (format === "csv") {
      const header = Object.keys(rows[0] || {}).join(",");
      const body = rows
        .map((r) =>
          Object.values(r)
            .map((v) => `"${v}"`)
            .join(",")
        )
        .join("\n");
      download(`${header}\n${body}`, `laporan-rph-${range}.csv`, "text/csv;charset=utf-8");
    } else if (format === "json") {
      download(JSON.stringify(rows, null, 2), `laporan-rph-${range}.json`, "application/json");
    } else {
      window.print();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">Ekspor Laporan</h3>
            <p className="text-sm text-gray-500">
              Rekapitulasi harian ke file eksternal
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Rentang */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Rentang Tanggal
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["7d", "14d", "30d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    range === r
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {r === "7d" ? "7 hari" : r === "14d" ? "14 hari" : "30 hari"}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Format Ekspor
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["csv", "json", "print"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    format === f
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {f === "csv" ? "📄 CSV" : f === "json" ? "📦 JSON" : "🖨 Print"}
                </button>
              ))}
            </div>
          </div>

          {/* Ringkasan */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Jumlah baris</span>
              <span className="font-medium">{rows.length} hari</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-500">Total omset</span>
              <span className="font-medium">
                Rp {rows.reduce((a, r) => a + r.omset, 0).toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-500">Total pengeluaran</span>
              <span className="font-medium">
                Rp {rows.reduce((a, r) => a + r.pengeluaran, 0).toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button onClick={handleExport}>
            {format === "print" ? "Cetak" : "Download"}
          </Button>
        </div>
      </div>
    </div>
  );
}