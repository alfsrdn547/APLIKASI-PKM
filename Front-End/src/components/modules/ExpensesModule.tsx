"use client";

import { useState } from "react";
import type { ExpenseCategory, FormErrors } from "@/types";
import { EXPENSE_CATEGORIES } from "@/constants/products";
import { useRPHStore } from "@/stores/useRPHStore";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { ExpenseCategoryBadge, Money } from "@/components/ui/custom-badges";
import { isFutureDate, isPositive, todayISO, formatShortDate, formatRp } from "@/lib/utils";

interface ExpenseFormState {
  date: string;
  category: ExpenseCategory | "";
  description: string;
  amount: string;
}

export function ExpensesModule() {
  const expenses = useRPHStore((s) => s.expenses);
  const addExpense = useRPHStore((s) => s.addExpense);
  const removeExpense = useRPHStore((s) => s.removeExpense);

  const [form, setForm] = useState<ExpenseFormState>({
    date: todayISO(),
    category: "",
    description: "",
    amount: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [monthFilter, setMonthFilter] = useState("");

  const months = [...new Set(expenses.map((e) => e.date.slice(0, 7)))].sort().reverse();
  const filtered = monthFilter
    ? expenses.filter((e) => e.date.startsWith(monthFilter))
    : expenses;

  const totalAmount = filtered.reduce((a, e) => a + e.amount, 0);

  // ─── Validasi ────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.date) errs.date = "Tanggal wajib diisi";
    else if (isFutureDate(form.date)) errs.date = "Tanggal tidak boleh di masa depan";

    if (!form.category) errs.category = "Pilih kategori";

    if (!form.description.trim()) errs.description = "Deskripsi wajib diisi";

    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount)) errs.amount = "Nominal wajib diisi";
    else if (!isPositive(amount)) errs.amount = "Nominal harus positif";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await addExpense({
        date: form.date,
        category: form.category as ExpenseCategory,
        description: form.description.trim(),
        amount: parseFloat(form.amount),
      });
      setForm({ ...form, category: "", description: "", amount: "" });
      setErrors({});
    } catch {
      setErrors({ submit: "Gagal menyimpan pengeluaran. Coba lagi." });
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeExpense(id);
    } catch {
      setErrors({ submit: "Gagal menghapus pengeluaran." });
    }
  };

  const columns = [
    {
      key: "date",
      header: "Tanggal",
      render: (r: (typeof filtered)[0]) => formatShortDate(r.date),
    },
    {
      key: "category",
      header: "Kategori",
      render: (r: (typeof filtered)[0]) => (
        <ExpenseCategoryBadge category={r.category} />
      ),
    },
    {
      key: "description",
      header: "Keterangan",
      render: (r: (typeof filtered)[0]) => r.description,
    },
    {
      key: "amount",
      header: "Nominal",
      render: (r: (typeof filtered)[0]) => <Money value={r.amount} />,
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
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form */}
      <Card
        title="Transaksi & Pengeluaran Operasional"
        subtitle="Pencatatan beban produksi harian (Modul 3)"
      >
        {errors.submit && (
          <p className="mb-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {errors.submit}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Tanggal"
              max={todayISO()}
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              error={errors.date}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Kategori
              </label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
              >
                <option value="">— Pilih kategori —</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-red-600">{errors.category}</p>}
            </div>
          </div>
          <Input
            type="text"
            label="Keterangan"
            placeholder="Contoh: Es batu 50kg, biaya angkut, pakan sementara…"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            error={errors.description}
          />
          <Input
            type="number"
            min={0}
            step="any"
            label="Nominal (Rp)"
            placeholder="Contoh: 150000"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            error={errors.amount}
          />
          <div className="flex justify-end">
            <Button type="submit">Simpan Pengeluaran</Button>
          </div>
        </form>
      </Card>

      {/* Rekap */}
      <Card
        title="Rekap Pengeluaran Harian"
        subtitle={`Total: ${formatRp(totalAmount)} · ${filtered.length} catatan`}
        action={
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">Semua bulan</option>
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        }
      >
        <Table columns={columns} data={filtered} emptyMessage="Belum ada pengeluaran" />
      </Card>
    </div>
  );
}