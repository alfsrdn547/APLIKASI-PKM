"use client";

import { useState } from "react";
import type { FormErrors } from "@/types";
import { PRODUCTS, DEFAULT_PRICES, BUTCHERY_DISTRIBUTION, AVG_WEIGHT_PER_EKOR } from "@/constants/products";
import { useRPHStore } from "@/stores/useRPHStore";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { isFutureDate, isPositive, isNonNegative, todayISO, formatShortDate } from "@/lib/utils";

const KG_PRODUCTS = PRODUCTS.filter((p) => p.unit === "kg");

export function ButcherForm() {
  const addButchery = useRPHStore((s) => s.addButchery);
  const incoming = useRPHStore((s) => s.incoming);

  const [date, setDate] = useState(todayISO());
  const [incomingId, setIncomingId] = useState("");
  const [chickenCount, setChickenCount] = useState("");
  const [notes, setNotes] = useState("");
  const [qtyByCode, setQtyByCode] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // ─── Prefill distribusi otomatis ─────────────────────────────────
  const prefillFromCount = (count: number) => {
    const next: Record<string, string> = {};
    for (const p of KG_PRODUCTS) {
      const dist = BUTCHERY_DISTRIBUTION[p.code];
      next[p.code] = dist
        ? String(Math.round(count * AVG_WEIGHT_PER_EKOR * dist * 10) / 10)
        : "0";
    }
    setQtyByCode(next);
  };

  const setCount = (v: string) => {
    setChickenCount(v);
    const n = parseFloat(v);
    if (Number.isFinite(n) && n > 0) prefillFromCount(n);
  };

  const totalKg = KG_PRODUCTS.reduce(
    (sum, p) => sum + (parseFloat(qtyByCode[p.code]) || 0),
    0
  );
  const countNum = parseFloat(chickenCount) || 0;

  // ─── Validasi ────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!date) errs.date = "Tanggal wajib diisi";
    else if (isFutureDate(date)) errs.date = "Tanggal tidak boleh di masa depan";

    const cnt = parseInt(chickenCount, 10);
    if (!chickenCount || isNaN(cnt) || !isPositive(cnt) || !Number.isInteger(cnt))
      errs.chickenCount = "Jumlah ekor wajib diisi (bilangan bulat positif)";

    const parts = KG_PRODUCTS.filter((p) => (parseFloat(qtyByCode[p.code]) || 0) > 0);
    if (parts.length === 0)
      errs.parts = "Masukkan minimal 1 bagian dengan jumlah lebih dari 0";

    for (const p of KG_PRODUCTS) {
      const q = parseFloat(qtyByCode[p.code] || "0");
      if (!isNaN(q) && !isNonNegative(q))
        errs[`qty_${p.code}`] = "Tidak boleh negatif";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const parts = KG_PRODUCTS
      .map((p) => ({ productCode: p.code, qtyKg: parseFloat(qtyByCode[p.code]) || 0 }))
      .filter((part) => part.qtyKg > 0);

    setSaving(true);
    try {
      await addButchery({
        date,
        incomingId: incomingId || null,
        chickenCount: parseInt(chickenCount, 10),
        parts,
        notes: notes.trim(),
      });
      setChickenCount("");
      setQtyByCode({});
      setNotes("");
      setErrors({});
    } catch {
      setErrors({ submit: "Gagal menyimpan pemotongan. Coba lagi." });
    } finally {
      setSaving(false);
    }
  };

  // ─── Opsi batch (dari penerimaan) ────────────────────────────────
  const batchOptions = [...incoming]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((i) => ({
      value: i.id,
      label: `${formatShortDate(i.date)} — ${(i.chickenIn).toLocaleString("id-ID")} ekor${i.notes ? " · " + i.notes : ""}`,
    }));

  return (
    <Card
      title="Input Pemotongan Manual"
      subtitle="Konversi ayam jadi potongan (kg) — hasilnya jadi sumber stok Papan Tulis"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            type="date"
            label="Tanggal Pemotongan"
            max={todayISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
          />
          <Select
            label="Batch Penerimaan (opsional)"
            placeholder="— Tanpa batch / manual —"
            options={batchOptions}
            value={incomingId}
            onChange={(e) => setIncomingId(e.target.value)}
          />
          <Input
            type="number"
            min={1}
            step={1}
            label="Jumlah Ayam Dipotong (ekor)"
            placeholder="Contoh: 100"
            value={chickenCount}
            onChange={(e) => setCount(e.target.value)}
            error={errors.chickenCount}
            hint="Tidak menghitung ulang ke karkas; ini kontrol manual."
          />
        </div>

        {errors.submit && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {errors.submit}
          </p>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-500">
            {countNum > 0 ? (
              <>Estimasi: <span className="font-medium text-gray-700">{countNum * AVG_WEIGHT_PER_EKOR} kg</span> ({countNum} ekor × 1.8 kg)</>
            ) : (
              "Masukkan jumlah ekor untuk mengisi distribusi otomatis."
            )}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { if (countNum > 0) prefillFromCount(countNum); }}
          >
            Reset ke Distribusi
          </Button>
        </div>

        {/* Breakdown grid */}
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <div className="col-span-2">Kode</div>
            <div className="col-span-6">Produk</div>
            <div className="col-span-2">Qty (kg)</div>
            <div className="col-span-2 text-right">Harga/kg</div>
          </div>
          {KG_PRODUCTS.map((p) => {
            const q = parseFloat(qtyByCode[p.code] || "0") || 0;
            return (
              <div
                key={p.code}
                className="grid grid-cols-12 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"
              >
                <div className="col-span-2 font-mono text-sm font-medium">{p.code}</div>
                <div className="col-span-6 text-sm text-gray-700">{p.name}</div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    value={qtyByCode[p.code] ?? ""}
                    onChange={(e) => setQtyByCode((q) => ({ ...q, [p.code]: e.target.value }))}
                    error={errors[`qty_${p.code}`]}
                    className="px-2 py-1 text-sm"
                  />
                </div>
                <div className="col-span-2 text-right font-mono text-sm text-gray-500">
                  {q > 0 ? `Rp ${Math.round(q * (DEFAULT_PRICES[p.code] || 0)).toLocaleString("id-ID")}` : ""}
                </div>
              </div>
            );
          })}
        </div>

        {errors.parts && <p className="text-sm text-red-600">{errors.parts}</p>}

        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="text-sm">
            <span className="text-gray-500">Total: </span>
            <span className="text-lg font-bold text-gray-900">
              {totalKg.toFixed(1)} kg
            </span>
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              Simpan Pemotongan
            </Button>
          </div>
        </div>

        <Input
          type="text"
          label="Catatan (opsional)"
          placeholder="Contoh: Shift pagi, susut 2%"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </form>
    </Card>
  );
}