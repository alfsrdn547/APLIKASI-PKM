"use client";

import { useMemo, useState } from "react";
import type { SalesOrder } from "@/types";
import { useRPHStore } from "@/stores/useRPHStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Money, PayStatusBadge } from "@/components/ui/custom-badges";
import { formatShortDate } from "@/lib/utils";
import { useUser } from "@/lib/useUser";

type CustomerGroup = {
  key: string;
  name: string;
  phone: string;
  total: number;
  paid: number;
  sisa: number;
  orders: SalesOrder[];
};

/**
 * Tagihan per Customer — akumulasi lintas transaksi (permintaan tim).
 * Murni agregat dari sales yang sudah ada: TANPA kolom/tabel baru.
 * Pembayaran dicatat PER ORDER (input nominal di baris order yang
 * di-expand), bukan lump-sum per kustomer — jadi gak perlu logic alokasi.
 */
export function CustomerBillings() {
  const sales = useRPHStore((s) => s.sales);
  const updateOrderPayment = useRPHStore((s) => s.updateOrderPayment);
  const user = useUser();
  const canWrite = user?.role === "operator";

  const [openKey, setOpenKey] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const groups = useMemo<CustomerGroup[]>(() => {
    const map = new Map<string, CustomerGroup>();
    for (const o of sales) {
      // Key = nama + telepon — nama sama tanpa telepon dianggap pelanggan sama.
      const key = `${o.customerName}|${o.customerPhone ?? ""}`.toLowerCase();
      let g = map.get(key);
      if (!g) {
        g = { key, name: o.customerName, phone: o.customerPhone ?? "", total: 0, paid: 0, sisa: 0, orders: [] };
        map.set(key, g);
      }
      g.total += o.totalAmount;
      g.paid += o.paidAmount;
      g.orders.push(o);
    }
    for (const g of map.values()) {
      g.sisa = g.total - g.paid;
      g.orders.sort((a, b) => b.date.localeCompare(a.date));
    }
    return [...map.values()].sort(
      (a, b) => b.sisa - a.sisa || a.name.localeCompare(b.name)
    );
  }, [sales]);

  const pay = async (order: SalesOrder) => {
    setError("");
    const amt = parseFloat(amounts[order.id] ?? "");
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Nominal bayar harus angka lebih dari 0.");
      return;
    }
    // Cap di total — kelebihan bayar bikin "sisa" minus yang gak masuk akal.
    const newPaid = Math.min(order.paidAmount + amt, order.totalAmount);
    setBusyId(order.id);
    try {
      await updateOrderPayment(order.id, {
        paidAmount: Math.round(newPaid * 100) / 100,
        payStatus: newPaid >= order.totalAmount ? "lunas" : "belum_lunas",
      });
      setAmounts((m) => ({ ...m, [order.id]: "" }));
    } catch {
      setError("Gagal menyimpan pembayaran. Coba lagi.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card
      title="Tagihan per Customer"
      subtitle="Akumulasi total, dibayar & sisa lintas transaksi — klik baris untuk detail per order"
    >
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Header */}
      <div className="grid grid-cols-12 gap-2 border-b border-gray-200 px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
        <div className="col-span-6 sm:col-span-5">Pelanggan</div>
        <div className="col-span-3 text-right sm:col-span-3">Total Tagihan</div>
        <div className="hidden text-right sm:col-span-2 sm:block">Dibayar</div>
        <div className="col-span-3 text-right sm:col-span-2">Sisa</div>
      </div>

      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Belum ada transaksi penjualan
        </p>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {groups.map((g) => {
            const open = openKey === g.key;
            return (
              <div key={g.key}>
                <button
                  type="button"
                  onClick={() => setOpenKey(open ? null : g.key)}
                  className="grid w-full grid-cols-12 items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="col-span-6 min-w-0 sm:col-span-5">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {g.name}
                      <span className="ml-1.5 text-xs font-normal text-gray-400">
                        {open ? "▲" : "▼"}
                      </span>
                    </p>
                    {g.phone && (
                      <p className="truncate text-xs text-gray-400 dark:text-gray-500">{g.phone}</p>
                    )}
                  </div>
                  <div className="col-span-3 text-right text-sm font-mono text-gray-700 dark:text-gray-300">
                    <Money value={g.total} />
                  </div>
                  <div className="hidden text-right text-sm font-mono text-gray-500 sm:col-span-2 sm:block dark:text-gray-400">
                    <Money value={g.paid} />
                  </div>
                  <div
                    className={`col-span-3 text-right text-sm font-mono font-semibold sm:col-span-2 ${
                      g.sisa > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-green-600 dark:text-green-400"
                    }`}
                  >
                    <Money value={g.sisa} />
                  </div>
                </button>

                {open && (
                  <div className="space-y-2 border-t border-gray-100 bg-gray-50 px-3 py-3 dark:border-gray-800 dark:bg-gray-900/50">
                    {g.orders.map((o) => {
                      const sisa = o.totalAmount - o.paidAmount;
                      return (
                        <div
                          key={o.id}
                          className="grid grid-cols-12 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
                        >
                          <div className="col-span-3 sm:col-span-2 text-xs text-gray-500 dark:text-gray-400">
                            {formatShortDate(o.date)}
                          </div>
                          <div className="col-span-4 sm:col-span-3 text-sm text-gray-700 dark:text-gray-300">
                            <Money value={o.totalAmount} />
                          </div>
                          <div className="col-span-5 sm:col-span-3">
                            <PayStatusBadge status={o.payStatus} />
                            <span className="ml-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                              dibayar <Money value={o.paidAmount} />
                            </span>
                          </div>
                          <div className="col-span-12 sm:col-span-4 flex items-center justify-end gap-1.5">
                            {sisa > 0 ? (
                              <>
                                <span className="text-[11px] text-amber-600 dark:text-amber-400">
                                  sisa <Money value={sisa} />
                                </span>
                                {canWrite && (
                                  <>
                                    <input
                                      type="number"
                                      min={0}
                                      step="any"
                                      placeholder="Bayar…"
                                      value={amounts[o.id] ?? ""}
                                      onChange={(e) =>
                                        setAmounts((m) => ({ ...m, [o.id]: e.target.value }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          void pay(o);
                                        }
                                      }}
                                      className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
                                    />
                                    <Button
                                      size="sm"
                                      disabled={busyId === o.id}
                                      onClick={() => void pay(o)}
                                    >
                                      {busyId === o.id ? "…" : "Bayar"}
                                    </Button>
                                  </>
                                )}
                              </>
                            ) : (
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                ✓ Lunas
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
