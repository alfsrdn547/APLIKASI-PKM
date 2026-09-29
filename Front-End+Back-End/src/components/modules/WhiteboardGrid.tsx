"use client";

import { useState } from "react";
import type { WhiteboardEntry } from "@/types";
import { useRPHStore } from "@/stores/useRPHStore";
import { PRODUCT_MAP } from "@/constants/products";
import { cn, formatRp, formatShortDate, todayISO } from "@/lib/utils";

function sortEntries(entries: WhiteboardEntry[], sort: string) {
  return [...entries].sort((a, b) => {
    switch (sort) {
      case "closing-desc":
        return b.closingStock - a.closingStock;
      case "closing-asc":
        return a.closingStock - b.closingStock;
      case "incoming-desc":
        return b.incoming - a.incoming;
      case "outgoing-desc":
        return b.outgoing - a.outgoing;
      default:
        return a.productCode.localeCompare(b.productCode);
    }
  });
}

export function WhiteboardGrid() {
  const getWhiteboard = useRPHStore((s) => s.getWhiteboard);
  const butchery = useRPHStore((s) => s.butchery);
  const [date, setDate] = useState(todayISO());
  const [sort, setSort] = useState("code");

  const entries = sortEntries(getWhiteboard(date), sort);
  const hasButcheryOnDate = butchery.some((b) => b.date === date);
  const totalIncoming = entries.reduce((a, e) => a + e.incoming, 0);
  const totalOutgoing = entries.reduce((a, e) => a + e.outgoing, 0);
  const totalClosing = entries.reduce((a, e) => a + e.closingStock, 0);

  return (
    <div className="space-y-4">
      {/* Toolbar: tanggal + sortir */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Tanggal:</label>
          <input
            type="date"
            max={todayISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Urutkan:</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="code">Kode Barang</option>
            <option value="closing-desc">Stok Akhir ↓</option>
            <option value="closing-asc">Stok Akhir ↑</option>
            <option value="incoming-desc">Masuk Terbanyak</option>
            <option value="outgoing-desc">Keluar Terbanyak</option>
          </select>
        </div>
      </div>

      {!hasButcheryOnDate && (
        <p className="rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Belum ada catatan pemotongan untuk tanggal ini — stok masuk 0. Catat di{" "}
          <span className="font-medium">menu Pemotongan</span>.
        </p>
      )}

      {/* Ringkasan stok */}
      <div className="grid grid-cols-3 gap-3 text-center lg:max-w-md lg:ml-auto">
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-600">Masuk</p>
          <p className="font-bold text-green-800">{totalIncoming.toFixed(0)} kg</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-600">Keluar</p>
          <p className="font-bold text-red-800">{totalOutgoing.toFixed(0)} kg</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-600">Stok Akhir</p>
          <p className="font-bold text-blue-800">{totalClosing.toFixed(0)} kg</p>
        </div>
      </div>

      {/* Grid / katalog kode barang */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {entries.map((entry) => {
          const product = PRODUCT_MAP[entry.productCode];
          const low = entry.closingStock < 20;
          const out = entry.closingStock <= 0;
          return (
            <div
              key={entry.productCode}
              className={cn(
                "rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md",
                out ? "border-gray-300 opacity-70" : "border-gray-200"
              )}
            >
              {/* Header produk */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block rounded-md bg-gray-100 px-2 py-1 font-mono text-sm font-bold text-gray-700">
                    {entry.productCode}
                  </span>
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    {product?.name ?? entry.productCode}
                  </h3>
                </div>
                {out ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-600">
                    Habis
                  </span>
                ) : low ? (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-700">
                    Menipis
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-600">
                    Ready
                  </span>
                )}
              </div>

              {/* Stok */}
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center">
                <div>
                  <p className="text-[11px] text-gray-400">Awal</p>
                  <p className="text-sm font-semibold">
                    {entry.openingStock.toFixed(1)}
                  </p>
                </div>
                <div className="border-x border-gray-100">
                  <p className="text-[11px] text-green-600">+ Masuk</p>
                  <p className="text-sm font-semibold text-green-700">
                    +{entry.incoming.toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-red-500">− Keluar</p>
                  <p className="text-sm font-semibold text-red-600">
                    −{entry.outgoing.toFixed(1)}
                  </p>
                </div>
              </div>

              {/* Closing stock + harga */}
              <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <div>
                  <p className="text-[11px] text-gray-400">Stok Akhir</p>
                  <p
                    className={cn(
                      "text-lg font-bold",
                      out
                        ? "text-red-600"
                        : low
                        ? "text-yellow-600"
                        : "text-gray-900"
                    )}
                  >
                    {entry.closingStock.toFixed(1)}{" "}
                    <span className="text-xs font-normal text-gray-400">
                      {product?.unit}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-gray-400">Harga</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatRp(entry.unitPrice)}
                    <span className="text-xs font-normal text-gray-400">
                      /{product?.unit}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        Papan tulis digital — perhitungan stok {formatShortDate(date)}, update
        real-time saat ada penjualan.
      </p>
    </div>
  );
}