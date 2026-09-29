"use client";

import { useState } from "react";
import { useRPHStore } from "@/stores/useRPHStore";
import { Table } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatShortDate } from "@/lib/utils";

export function IncomingTable() {
  const incoming = useRPHStore((s) => s.incoming);
  const [selectedDate, setSelectedDate] = useState("");

  const dates = [...new Set(incoming.map((i) => i.date))].sort().reverse();
  const filtered = selectedDate
    ? incoming.filter((i) => i.date === selectedDate)
    : incoming;

  const columns = [
    {
      key: "date",
      header: "Tanggal",
      render: (r: (typeof filtered)[0]) => formatShortDate(r.date),
    },
    {
      key: "chickenIn",
      header: "Masuk",
      render: (r: (typeof filtered)[0]) => (
        <span className="font-mono">{r.chickenIn.toLocaleString("id-ID")}</span>
      ),
    },
    {
      key: "chickenDead",
      header: "Mati",
      render: (r: (typeof filtered)[0]) => (
        <span className="font-mono text-red-600">
          {r.chickenDead.toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      key: "net",
      header: "Net Produksi",
      render: (r: (typeof filtered)[0]) => (
        <Badge variant="success">
          {(r.chickenIn - r.chickenDead).toLocaleString("id-ID")} ekor
        </Badge>
      ),
    },
    {
      key: "nopol",
      header: "Nopol",
      render: (r: (typeof filtered)[0]) => (
        <span className="text-sm text-gray-500">{r.nopol || "-"}</span>
      ),
    },
    {
      key: "tonase",
      header: "Tonase (kg)",
      render: (r: (typeof filtered)[0]) => (
        <span className="font-mono text-sm">{r.tonase ? r.tonase.toLocaleString("id-ID") : "-"}</span>
      ),
    },
    {
      key: "totalHarga",
      header: "Total Harga",
      render: (r: (typeof filtered)[0]) => (
        <span className="font-mono text-sm">
          {r.totalHarga ? `Rp ${r.totalHarga.toLocaleString("id-ID")}` : "-"}
        </span>
      ),
    },
    {
      key: "notes",
      header: "Catatan",
      render: (r: (typeof filtered)[0]) => (
        <span className="text-gray-500">{r.notes || "-"}</span>
      ),
    },
  ];

  return (
    <Card
      title="Riwayat Penerimaan"
      subtitle={`${filtered.length} catatan masuk`}
      action={
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="filter-date">Filter tanggal</label>
          <select
            id="filter-date"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          >
            <option value="">Semua</option>
            {dates.map((d) => (
              <option key={d} value={d}>
                {formatShortDate(d)}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <Table columns={columns} data={filtered} emptyMessage="Belum ada penerimaan" />
    </Card>
  );
}