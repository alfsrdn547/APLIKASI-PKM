"use client";

import { useState } from "react";
import type { SalesOrder } from "@/types";
import { useRPHStore } from "@/stores/useRPHStore";
import { SalesForm } from "@/components/modules/SalesForm";
import { SalesHistory } from "@/components/modules/SalesHistory";
import { InvoicePrint } from "@/components/modules/InvoicePrint";

export default function PenjualanPage() {
  const [printOrder, setPrintOrder] = useState<SalesOrder | null>(null);
  const sales = useRPHStore((s) => s.sales);

  const handleRowClick = (row: SalesOrder) => {
    if (row.status === "completed" || row.status === "processing") {
      setPrintOrder(row);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Penjualan & Pemesanan</h2>
        <p className="text-sm text-gray-500">
          Modul 3 — Transaksi penjualan, filter/sort riwayat & cetak invoice 2 rangkap
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Tip:</span>
        <span className="rounded bg-gray-100 px-2 py-1">
          Klik baris status Selesai/Proses di riwayat untuk cetak invoice
        </span>
      </div>

      <SalesForm />

      <SalesHistory onRowClick={handleRowClick} />

      {printOrder && <InvoicePrint order={printOrder} onClose={() => setPrintOrder(null)} />}
    </div>
  );
}