"use client";

import { useRef } from "react";
import type { SalesOrder } from "@/types";
import { formatRp, formatDisplayDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface InvoicePrintProps {
  order: SalesOrder;
  onClose: () => void;
}

// ─── Satu lembar invoice (dipakai 2x: Admin & Customer) ─────────────
function InvoiceSheet({ order, variant }: { order: SalesOrder; variant: "admin" | "customer" }) {
  const isAdmin = variant === "admin";
  return (
    <div className="invoice-sheet rounded border border-gray-300 p-6">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-gray-800 pb-3">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-wide">
            {isAdmin ? "Invoice — Copy Admin" : "Invoice — Copy Customer"}
          </h2>
          <p className="text-sm text-gray-600">Rumah Potong Hewan (RPH)</p>
          <p className="text-xs text-gray-500">Digitalisasi Sistem Pencatatan — Modul 3</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-mono text-xs text-gray-500">No. Invoice</p>
          <p className="font-mono font-bold">{order.id.toUpperCase()}</p>
          <p className="mt-1 text-xs text-gray-500">
            {formatDisplayDate(order.date)}
          </p>
          {isAdmin && (
            <p className="mt-1 rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
              ARSIP ADMIN
            </p>
          )}
        </div>
      </div>

      {/* Customer info */}
      <div className="grid grid-cols-2 gap-4 py-4 text-sm">
        <div>
          <p className="text-xs uppercase text-gray-500">Diterima Oleh</p>
          <p className="font-semibold">{order.customerName}</p>
          {order.customerPhone && (
            <p className="text-xs text-gray-500">{order.customerPhone}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-gray-500">Status</p>
          <p className="font-semibold capitalize">{order.status}</p>
        </div>
      </div>

      {/* Item table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-gray-300 bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <th className="py-2 text-left pl-2">Kode</th>
            <th className="py-2 text-left">Item</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Harga</th>
            <th className="py-2 pr-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-1.5 pl-2 font-mono text-xs">{it.productCode}</td>
              <td className="py-1.5">{it.productName}</td>
              <td className="py-1.5 text-right font-mono">
                {it.quantity} {it.unit}
              </td>
              <td className="py-1.5 text-right font-mono">{formatRp(it.unitPrice)}</td>
              <td className="py-1.5 pr-2 text-right font-mono">{formatRp(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="py-2 text-right font-semibold">
              Total Keseluruhan
            </td>
            <td className="py-2 pr-2 text-right font-bold text-blue-700">
              {formatRp(order.totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Footer */}
      <div className="mt-6 flex items-end justify-between text-xs text-gray-500">
        <div className="space-y-1">
          <p className="text-gray-700">Catatan: {order.notes || "-"}</p>
          <p>Terima kasih atas kepercayaan Anda.</p>
        </div>
        <div className="text-center">
          <p>Admin RPH</p>
          <div className="mx-auto mt-8 h-px w-28 bg-gray-400" />
          <p className="mt-1">(_________________)</p>
        </div>
      </div>
    </div>
  );
}

// ─── Wrapper: 2 rangkap A4 ───────────────────────────────────────────
export function InvoicePrint({ order, onClose }: InvoicePrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    // Print only via CSS media query — no iframe juggling needed
    window.print();
  };

  return (
    <>
      {/* Overlay on screen — hidden saat print */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 print:static print:bg-white print:p-0 print:block">
        {/* Popup body — hidden at print */}
        <div className="print:hidden w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold">Pratinjau & Cetak Invoice</h3>
              <p className="text-sm text-gray-500">
                Layout 2 rangkap siap A4 (potong di garis putus-putus)
              </p>
            </div>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto bg-gray-100 p-5 sm:max-h-[65vh]">
            {/* Screen preview: 2 rangkap stacked */}
            <div className="hidden md:block">
              <InvoiceSheet order={order} variant="admin" />
              <div className="my-3 flex items-center gap-3 text-xs text-gray-500">
                <span className="h-px flex-1 bg-gray-300" />
                ✂ Potong disini ✂
                <span className="h-px flex-1 bg-gray-300" />
              </div>
              <InvoiceSheet order={order} variant="customer" />
            </div>
            <div className="md:hidden">
              <InvoiceSheet order={order} variant="admin" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
            <Button variant="ghost" onClick={onClose}>Tutup</Button>
            <Button onClick={handlePrint} icon={<span>🖨</span>}>
              Cetak Invoice
            </Button>
          </div>
        </div>

        {/* Print-only layout — exact 2 rangkap for CSS @media print */}
        <div ref={printRef} className="print-2up hidden print:block">
          <InvoiceSheet order={order} variant="admin" />
          <div className="print-cut-line" />
          <InvoiceSheet order={order} variant="customer" />
        </div>
      </div>
    </>
  );
}