"use client";

import { useState } from "react";
import { useRPHStore } from "@/stores/useRPHStore";
import { Table } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { formatShortDate } from "@/lib/utils";

export function ButcheryHistory() {
  const butchery = useRPHStore((s) => s.butchery);
  const incoming = useRPHStore((s) => s.incoming);
  const removeButchery = useRPHStore((s) => s.removeButchery);
  const [selectedDate, setSelectedDate] = useState("");
  const [submitError, setSubmitError] = useState("");

  const dates = [...new Set(butchery.map((b) => b.date))].sort().reverse();
  const filtered = selectedDate
    ? butchery.filter((b) => b.date === selectedDate)
    : butchery;

  const batchLabel = (id: string | null) => {
    if (!id) return "—";
    const batch = incoming.find((i) => i.id === id);
    if (!batch) return "—";
    return `${formatShortDate(batch.date)} · ${batch.chickenIn.toLocaleString("id-ID")} ekor${batch.notes ? " — " + batch.notes : ""}`;
  };

  const handleRemove = async (id: string) => {
    try {
      setSubmitError("");
      await removeButchery(id);
    } catch {
      setSubmitError("Gagal menghapus pemotongan.");
    }
  };

  const columns = [
    {
      key: "date",
      header: "Tanggal",
      render: (r: (typeof filtered)[0]) => formatShortDate(r.date),
    },
    {
      key: "batch",
      header: "Batch",
      render: (r: (typeof filtered)[0]) => (
        <span className="text-sm text-gray-500">{batchLabel(r.incomingId)}</span>
      ),
    },
    {
      key: "chickenCount",
      header: "Ayam",
      render: (r: (typeof filtered)[0]) => (
        <span className="font-mono">{r.chickenCount} ekor</span>
      ),
    },
    {
      key: "totalKg",
      header: "Total kg",
      render: (r: (typeof filtered)[0]) => {
        const total = r.parts.reduce((a, p) => a + p.qtyKg, 0);
        return <span className="font-mono font-medium">{total.toFixed(1)} kg</span>;
      },
    },
    {
      key: "parts",
      header: "Rincian",
      render: (r: (typeof filtered)[0]) => {
        const shown = r.parts.slice(0, 3);
        const more = r.parts.length - shown.length;
        return (
          <span className="text-sm text-gray-600">
            {shown.map((p) => `${p.productCode}×${p.qtyKg}`).join(", ")}
            {more > 0 ? ` +${more}` : ""}
          </span>
        );
      },
    },
    {
      key: "notes",
      header: "Catatan",
      render: (r: (typeof filtered)[0]) => r.notes || "—",
    },
    {
      key: "actions",
      header: "",
      render: (r: (typeof filtered)[0]) => (
        <button
          onClick={() => handleRemove(r.id)}
          className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500"
          aria-label="Hapus"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      ),
    },
  ];

  return (
    <Card
      title="Riwayat Pemotongan"
      subtitle={`${filtered.length} catatan potong`}
      action={
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="butchery-filter">Filter tanggal</label>
          <select
            id="butchery-filter"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            <option value="">Semua</option>
            {dates.map((d) => (
              <option key={d} value={d}>{formatShortDate(d)}</option>
            ))}
          </select>
        </div>
      }
    >
      {submitError && (
        <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {submitError}
        </p>
      )}
      <Table
        columns={columns}
        data={filtered}
        emptyMessage="Belum ada pemotongan"
      />
    </Card>
  );
}