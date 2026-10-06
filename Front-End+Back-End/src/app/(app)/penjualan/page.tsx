"use client";

import { useState } from "react";
import type { SalesOrder } from "@/types";
import { SalesForm } from "@/components/modules/SalesForm";
import { SalesHistory } from "@/components/modules/SalesHistory";
import { CustomerBillings } from "@/components/modules/CustomerBillings";
import { InvoicePrint } from "@/components/modules/InvoicePrint";

export default function PenjualanPage() {
  const [printOrder, setPrintOrder] = useState<SalesOrder | null>(null);

  const handleRowClick = (row: SalesOrder) => {
    if (row.status === "completed" || row.status === "processing") {
      setPrintOrder(row);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Penjualan & Pemesanan</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Modul 3 — Transaksi penjualan, filter/sort riwayat & cetak invoice
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>Tip:</span>
        <span className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-800">
          Klik baris status Selesai/Proses di riwayat untuk cetak invoice
        </span>
      </div>

      <SalesForm />

      <SalesHistory onRowClick={handleRowClick} />

      <CustomerBillings />

      {printOrder && <InvoicePrint order={printOrder} onClose={() => setPrintOrder(null)} />}
    </div>
  );
}