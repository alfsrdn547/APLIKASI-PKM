"use client";

import { useState } from "react";
import type { SalesOrder, OrderStatus, PayStatus, PickupStatus } from "@/types";
import { ORDER_STATUSES } from "@/constants/products";
import { useRPHStore } from "@/stores/useRPHStore";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { OrderStatusBadge, PayStatusBadge, PickupStatusBadge, Money } from "@/components/ui/custom-badges";
import { formatShortDate } from "@/lib/utils";

type SortField = "date" | "totalAmount" | "customerName";
type SortDir = "asc" | "desc";

interface SalesHistoryProps {
  onRowClick?: (order: SalesOrder) => void;
}

export function SalesHistory({ onRowClick }: SalesHistoryProps) {
  const sales = useRPHStore((s) => s.sales);
  const updateOrderStatus = useRPHStore((s) => s.updateOrderStatus);
  const updateOrderPayment = useRPHStore((s) => s.updateOrderPayment);

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusError, setStatusError] = useState("");

  // ─── Filter ────────────────────────────────────────────────────
  const filtered = sales
    .filter((o) => {
      const kw = keyword.trim().toLowerCase();
      const matchKw =
        !kw ||
        o.customerName.toLowerCase().includes(kw) ||
        o.id.toLowerCase().includes(kw);
      const matchStatus = !statusFilter || o.status === statusFilter;
      return matchKw && matchStatus;
    })
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      const cmp =
        typeof valA === "number"
          ? valA - Number(valB)
          : String(valA).localeCompare(String(valB));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleStatusClick = async (order: SalesOrder, status: OrderStatus) => {
    try {
      setStatusError("");
      await updateOrderStatus(order.id, status);
    } catch {
      setStatusError("Gagal mengubah status.");
    }
  };

  const togglePay = async (order: SalesOrder) => {
    try {
      setStatusError("");
      const next: PayStatus = order.payStatus === "lunas" ? "belum_lunas" : "lunas";
      await updateOrderPayment(order.id, {
        payStatus: next,
        paidAmount: next === "lunas" ? order.totalAmount : 0,
      });
    } catch {
      setStatusError("Gagal ubah status pembayaran.");
    }
  };

  const togglePickup = async (order: SalesOrder) => {
    try {
      setStatusError("");
      const next: PickupStatus = order.pickupStatus === "sudah_diambil" ? "belum_diambil" : "sudah_diambil";
      await updateOrderPayment(order.id, { pickupStatus: next });
    } catch {
      setStatusError("Gagal ubah status pengambilan.");
    }
  };

  const columns = [
    {
      key: "date",
      header: "Tanggal",
      render: (o: SalesOrder) => formatShortDate(o.date),
    },
    {
      key: "customerName",
      header: "Pemesan",
      render: (o: SalesOrder) => (
        <div>
          <p className="font-medium text-gray-900">{o.customerName}</p>
          {o.customerPhone && (
            <p className="text-xs text-gray-400">{o.customerPhone}</p>
          )}
        </div>
      ),
    },
    {
      key: "items",
      header: "Item",
      render: (o: SalesOrder) => (
        <span className="text-sm">
          {o.items.map((it) => `${it.productCode}×${it.quantity}`).join(", ")}
        </span>
      ),
    },
    {
      key: "totalAmount",
      header: "Total",
      render: (o: SalesOrder) => <Money value={o.totalAmount} />,
    },
    {
      key: "pembayaran",
      header: "Pembayaran",
      render: (o: SalesOrder) => {
        const sisa = o.totalAmount - o.paidAmount;
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <PayStatusBadge status={o.payStatus} />
              <button
                onClick={() => togglePay(o)}
                className="rounded px-1.5 py-0.5 text-[11px] text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                title={o.payStatus === "lunas" ? "Tandai belum lunas" : "Tandai lunas"}
              >
                {o.payStatus === "lunas" ? "↺" : "✓"}
              </button>
            </div>
            {o.payStatus !== "lunas" && (
              <span className="text-[11px] text-amber-600">
                Sisa Rp {sisa.toLocaleString("id-ID")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "pickup",
      header: "Ambil",
      render: (o: SalesOrder) => (
        <div className="flex items-center gap-2">
          <PickupStatusBadge status={o.pickupStatus} />
          <button
            onClick={() => togglePickup(o)}
            className="rounded px-1.5 py-0.5 text-[11px] text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            title={o.pickupStatus === "sudah_diambil" ? "Tandai belum diambil" : "Tandai sudah diambil"}
          >
            {o.pickupStatus === "sudah_diambil" ? "↺" : "✓"}
          </button>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (o: SalesOrder) => (
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={o.status} />
          <div className="flex gap-1">
            {ORDER_STATUSES.filter((s) => s.value !== o.status).map((s) => (
              <button
                key={s.value}
                onClick={() => handleStatusClick(o, s.value as OrderStatus)}
                className="rounded px-1.5 py-0.5 text-[11px] text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                title={`Ubah ke ${s.label}`}
              >
                {s.label === "Proses" ? "▶" : s.value}
              </button>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <Card
      title="Riwayat Penjualan"
      subtitle={`${filtered.length} transaksi`}
      action={
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Cari pemesan / no. order…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Semua status</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={sortField}
            onChange={(e) => toggleSort(e.target.value as SortField)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="date">Tanggal</option>
            <option value="customerName">Pemesan</option>
            <option value="totalAmount">Total</option>
          </select>
          <button
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            title="Ubah arah sortir"
          >
            {sortDir === "asc" ? "↑" : "↓"}
          </button>
        </div>
      }
    >
      {statusError && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {statusError}
        </p>
      )}
      <Table
        columns={columns}
        data={filtered}
        emptyMessage="Tidak ada transaksi"
        onRowClick={onRowClick ? (row) => onRowClick(row as unknown as SalesOrder) : undefined}
      />
    </Card>
  );
}