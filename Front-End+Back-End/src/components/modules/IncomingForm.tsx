"use client";

import { useState } from "react";
import type { FormErrors } from "@/types";
import { useRPHStore } from "@/stores/useRPHStore";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { todayISO, isFutureDate, isPositive, isNonNegative } from "@/lib/utils";

interface FormState {
  date: string;
  chickenIn: string;
  chickenDead: string;
  chickenBroken: string;
  nopol: string;
  tonase: string;
  hargaPerKg: string;
  kasbon: string;
  notes: string;
}

const INITIAL: FormState = {
  date: "",
  chickenIn: "",
  chickenDead: "",
  chickenBroken: "",
  nopol: "",
  tonase: "",
  hargaPerKg: "",
  kasbon: "",
  notes: "",
};

export function IncomingForm() {
  const addIncoming = useRPHStore((s) => s.addIncoming);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Clear error as user types
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  // ─── Validasi ────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: FormErrors = {};

    if (!form.date) errs.date = "Tanggal wajib diisi";
    else if (isFutureDate(form.date))
      errs.date = "Tanggal tidak boleh di masa depan";

    const inNum = parseFloat(form.chickenIn);
    if (!form.chickenIn || isNaN(inNum))
      errs.chickenIn = "Jumlah ayam masuk wajib diisi";
    else if (!isPositive(inNum))
      errs.chickenIn = "Jumlah harus lebih dari 0 (positif)";

    const deadNum = parseFloat(form.chickenDead || "0");
    if (isNaN(deadNum)) errs.chickenDead = "Harus berupa angka";
    else if (!isNonNegative(deadNum))
      errs.chickenDead = "Tidak boleh negatif";

    const brokenNum = parseFloat(form.chickenBroken || "0");
    if (isNaN(brokenNum)) errs.chickenBroken = "Harus berupa angka";
    else if (!isNonNegative(brokenNum))
      errs.chickenBroken = "Tidak boleh negatif";

    // Cross-field: ayam mati tidak boleh melebihi ayam masuk
    if (isPositive(inNum) && deadNum > inNum)
      errs.chickenDead = `Ayam mati (${deadNum}) melebihi ayam masuk (${inNum})`;

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await addIncoming({
        date: form.date,
        chickenIn: parseFloat(form.chickenIn),
        chickenDead: parseFloat(form.chickenDead || "0"),
        chickenBroken: parseFloat(form.chickenBroken || "0"),
        nopol: form.nopol.trim(),
        tonase: parseFloat(form.tonase || "0"),
        hargaPerKg: parseFloat(form.hargaPerKg || "0"),
        totalHarga: parseFloat(form.chickenIn || "0") * parseFloat(form.hargaPerKg || "0"),
        kasbon: parseFloat(form.kasbon || "0"),
        notes: form.notes.trim(),
      });
      setForm({ ...INITIAL, date: form.date }); // keep tanggal untuk input berikutnya
      setErrors({});
    } catch {
      setErrors({ submit: "Gagal menyimpan ke database. Coba lagi." });
    }
  };

  const inNum = parseFloat(form.chickenIn) || 0;
  const deadNum = parseFloat(form.chickenDead) || 0;
  const brokenNum = parseFloat(form.chickenBroken) || 0;

  return (
    <Card
      title="Input Barang Datang"
      subtitle="Penerimaan ayam dari surat jalan (Modul 1)"
    >
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            type="date"
            label="Tanggal Penerimaan"
            value={form.date || todayISO()}
            onChange={(e) => set("date", e.target.value)}
            error={errors.date}
            max={todayISO()}
          />
        </div>

        <Input
          type="number"
          min={0}
          step="any"
          label="Ayam Masuk (ekor)"
          placeholder="Contoh: 500"
          value={form.chickenIn}
          onChange={(e) => set("chickenIn", e.target.value)}
          error={errors.chickenIn}
          hint="Jumlah total per surat jalan"
        />

        <Input
          type="number"
          min={0}
          step="any"
          label="Ayam Mati / Afkir (ekor)"
          placeholder="Contoh: 12"
          value={form.chickenDead}
          onChange={(e) => set("chickenDead", e.target.value)}
          error={errors.chickenDead}
        />

        <Input
          type="number"
          min={0}
          step="any"
          label="Cacat Ringan (ekor)"
          placeholder="Contoh: 5"
          value={form.chickenBroken}
          onChange={(e) => set("chickenBroken", e.target.value)}
          error={errors.chickenBroken}
        />

        <Input
          type="text"
          label="No. Polisi Kendaraan (opsional)"
          placeholder="Contoh: B 1234 XX"
          value={form.nopol}
          onChange={(e) => set("nopol", e.target.value)}
        />

        <Input
          type="number"
          min={0}
          step="any"
          label="Tonase / Berat (kg, opsional)"
          placeholder="Contoh: 900"
          value={form.tonase}
          onChange={(e) => set("tonase", e.target.value)}
        />

        <Input
          type="number"
          min={0}
          step="any"
          label="Harga per Kg (opsional)"
          placeholder="Contoh: 38000"
          value={form.hargaPerKg}
          onChange={(e) => set("hargaPerKg", e.target.value)}
        />

        <Input
          type="number"
          min={0}
          step="any"
          label="Kasbon (opsional)"
          placeholder="Contoh: 500000"
          value={form.kasbon}
          onChange={(e) => set("kasbon", e.target.value)}
        />

        <Input
          type="text"
          label="Catatan / Supplier"
          placeholder="Contoh: Pagi — supplier Pak Budi"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          error={errors.notes}
        />

        {/* Pratinjau kalkulasi stok */}
        <div className="sm:col-span-2 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
          <p className="mb-2 text-sm font-medium text-blue-800">
            Kalkulasi Stok Siap Produksi (real-time)
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-blue-600">Ayam Masuk</p>
              <p className="text-lg font-bold text-blue-900">
                {Number.isFinite(inNum) ? inNum.toLocaleString("id-ID") : 0} ekor
              </p>
            </div>
            <div className="border-x border-blue-200">
              <p className="text-xs text-blue-600">Ayam Mati</p>
              <p className="text-lg font-bold text-red-600">
                −{Number.isFinite(deadNum) ? deadNum.toLocaleString("id-ID") : 0} ekor
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-600">Net Stok Siap</p>
              <p className="text-lg font-bold text-green-600">
                {Number.isFinite(inNum - deadNum)
                  ? (inNum - deadNum).toLocaleString("id-ID")
                  : 0}{" "}
                ekor
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-blue-700/70">
            Formula: Produksi Bersih = Ayam Masuk − Ayam Mati (afkir total)
          </p>
        </div>

        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setForm(INITIAL)}>
            Reset
          </Button>
          <Button type="submit" loading={false}>
            Simpan Penerimaan
          </Button>
        </div>
      </form>
    </Card>
  );
}