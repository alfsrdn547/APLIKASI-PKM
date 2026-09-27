"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useRPHStore } from "@/stores/useRPHStore";
import {
  type ImportModule,
  type IncomingRow,
  type ButcheryRow,
  type SalesRow,
  type ExpenseRow,
  downloadTemplate,
  parseXlsx,
  groupSalesRows,
} from "@/lib/excel";

const MODULE_OPTIONS: { value: ImportModule; label: string; icon: string }[] = [
  { value: "penerimaan", label: "Penerimaan", icon: "🚚" },
  { value: "pemotongan", label: "Pemotongan", icon: "🍗" },
  { value: "penjualan", label: "Penjualan", icon: "🧾" },
  { value: "pengeluaran", label: "Pengeluaran", icon: "💸" },
];

interface Result {
  ok: number;
  fail: number;
  errors: string[];
}

export function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const fetchAll = useRPHStore((s) => s.fetchAll);
  const addIncoming = useRPHStore((s) => s.addIncoming);
  const addButchery = useRPHStore((s) => s.addButchery);
  const addSalesOrder = useRPHStore((s) => s.addSalesOrder);
  const addExpense = useRPHStore((s) => s.addExpense);
  const [module, setModule] = useState<ImportModule>("penerimaan");
  const [rows, setRows] = useState<IncomingRow[] | ButcheryRow[] | SalesRow[] | ExpenseRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setRows([]);
    setResult(null);
    setParseError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleModuleChange = (m: ImportModule) => {
    setModule(m);
    reset();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setParseError(null);
    setResult(null);
    try {
      const parsed = await parseXlsx(file, module);
      setRows(parsed as IncomingRow[] | ButcheryRow[] | SalesRow[] | ExpenseRow[]);
    } catch (e: any) {
      setParseError(e?.message ?? "Gagal parse file");
      setRows([]);
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    let ok = 0, fail = 0;
    const errors: string[] = [];

    switch (module) {
      case "penerimaan": {
        for (const r of rows as IncomingRow[]) {
          try {
            await addIncoming({
              date: r.date,
              chickenIn: r.chickenIn,
              chickenDead: r.chickenDead,
              chickenBroken: r.chickenBroken,
              nopol: r.nopol,
              tonase: r.tonase,
              hargaPerKg: r.hargaPerKg,
              kasbon: r.kasbon,
              totalHarga: r.chickenIn * r.hargaPerKg,
              notes: r.notes,
            });
            ok++;
          } catch (e: any) {
            fail++;
            errors.push(`${r.date}: ${e?.message ?? "error"}`);
          }
        }
        break;
      }
      case "pemotongan": {
        for (const r of rows as ButcheryRow[]) {
          try {
            await addButchery({
              date: r.date,
              incomingId: null,
              chickenCount: r.chickenCount,
              parts: r.parts,
              notes: r.notes,
            });
            ok++;
          } catch (e: any) {
            fail++;
            errors.push(`${r.date}: ${e?.message ?? "error"}`);
          }
        }
        break;
      }
      case "penjualan": {
        const orders = groupSalesRows(rows as SalesRow[]);
        for (const o of orders) {
          try {
            await addSalesOrder({
              date: o.date,
              customerName: o.customerName,
              customerPhone: o.customerPhone,
              status: "pending",
              payStatus: o.payStatus as "lunas" | "belum_lunas",
              pickupStatus: o.pickupStatus as "sudah_diambil" | "belum_diambil",
              paidAmount: 0,
              notes: "",
              items: o.items.map((it) => ({
                productCode: it.productCode,
                productName: it.productName,
                quantity: it.quantity,
                unit: "kg",
                unitPrice: it.unitPrice,
                subtotal: it.quantity * it.unitPrice,
              })),
            });
            ok++;
          } catch (e: any) {
            fail++;
            errors.push(`${o.date} ${o.customerName}: ${e?.message ?? "error"}`);
          }
        }
        break;
      }
      case "pengeluaran": {
        for (const r of rows as ExpenseRow[]) {
          try {
            await addExpense({
              date: r.date,
              category: r.category as "es_batu" | "biaya_angkut" | "pakan" | "operasional_alat" | "lainnya",
              direction: r.direction as "keluar" | "masuk",
              sourceFund: r.sourceFund as "kas" | "bank" | "lainnya",
              description: r.description,
              amount: r.amount,
            });
            ok++;
          } catch (e: any) {
            fail++;
            errors.push(`${r.date}: ${e?.message ?? "error"}`);
          }
        }
        break;
      }
    }

    await fetchAll();
    setResult({ ok, fail, errors });
    setImporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">Import Data</h3>
            <p className="text-sm text-gray-500">
              Upload file Excel (.xlsx) sesuai template
            </p>
          </div>
          <button
            onClick={() => { reset(); onClose(); }}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Module selector */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Modul</label>
            <div className="grid grid-cols-4 gap-2">
              {MODULE_OPTIONS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => handleModuleChange(m.value)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    module === m.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="mr-1">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Download template */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              icon={<span>📥</span>}
              onClick={() => downloadTemplate(module)}
            >
              Download Template
            </Button>
            <span className="text-xs text-gray-400">
              File berisi sheet "Import" (isi datanya) + "Cara Pakai" (panduan langkah & contoh)
            </span>
          </div>

          {/* Guide blurb */}
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p className="font-medium">Cara pakai template:</p>
            <ol className="ml-4 mt-1 list-decimal space-y-0.5 text-blue-700">
              <li>Unduh template, buka sheet <b>Import</b> — kolom 1 = nama header, jangan diubah.</li>
              <li>Isi data mulai <b>baris 2</b>; ikuti format & contoh (buka sheet <b>Cara Pakai</b>).</li>
              <li>Simpan & upload file di sini. Baris yang salah akan dilaporkan satu-satu tanpa menghentikan sisanya.</li>
            </ol>
          </div>

          {/* File input */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Upload File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Parse error */}
          {parseError && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              ❌ {parseError}
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && !result && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">
                Preview — {rows.length} baris terdeteksi
              </p>
              <div className="max-h-48 overflow-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold text-gray-500">#</th>
                      {Object.keys(rows[0]).slice(0, 6).map((k) => (
                        <th key={k} className="px-2 py-1.5 text-left font-semibold text-gray-500">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                        {Object.values(r).slice(0, 6).map((v, j) => (
                          <td key={j} className="px-2 py-1.5 text-gray-700">
                            {Array.isArray(v) ? JSON.stringify(v).slice(0, 30) + "…" : String(v ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && (
                <p className="mt-1 text-xs text-gray-400">
                  …dan {rows.length - 5} baris lagi
                </p>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`rounded-lg px-4 py-3 text-sm ${result.fail === 0 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
              <p className="font-medium">
                {result.fail === 0
                  ? `✅ Berhasil import ${result.ok} data`
                  : `⚠️ ${result.ok} berhasil, ${result.fail} gagal`}
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs text-amber-800">
                  {result.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {result.errors.length > 10 && (
                    <li>…dan {result.errors.length - 10} error lainnya</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>
            {result ? "Tutup" : "Batal"}
          </Button>
          {!result && rows.length > 0 && (
            <Button
              onClick={handleImport}
              loading={importing}
              icon={<span>⬆️</span>}
            >
              Import {rows.length} Data
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
