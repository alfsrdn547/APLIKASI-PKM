"use client";

import { useState } from "react";
import type { FormErrors } from "@/types";
import { PRODUCTS, DEFAULT_PRICES } from "@/constants/products";
import { useRPHStore } from "@/stores/useRPHStore";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatRp, genId, isFutureDate, isPositive, isNonNegative, todayISO } from "@/lib/utils";

interface CartItem {
  key: string;
  productCode: string;
  quantity: string;
  price: string;
}

export function SalesForm() {
  const addSalesOrder = useRPHStore((s) => s.addSalesOrder);
  const getStockForDate = useRPHStore((s) => s.getStockForDate);

  const [date, setDate] = useState(todayISO());
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitLoading, setSubmitLoading] = useState(false);

  // ─── Validasi stok (sumber: papan tulis = catatan pemotongan) ──
  const getStock = (productCode: string) => {
    const st = getStockForDate(productCode, date);
    return { available: st.closing, estimated: st.incoming + st.opening };
  };

  const addItem = () => {
    const emptySlot: CartItem = {
      key: genId(),
      productCode: PRODUCTS[0].code,
      quantity: "",
      price: String(DEFAULT_PRICES[PRODUCTS[0].code]),
    };
    setCart((c) => [...c, emptySlot]);
  };

  const updateItem = (key: string, field: keyof CartItem, value: string) => {
    setCart((items) =>
      items.map((it) =>
        it.key === key
          ? field === "productCode"
            ? { ...it, productCode: value, price: String(DEFAULT_PRICES[value] || 0) }
            : { ...it, [field]: value }
          : it
      )
    );
  };

  const removeItem = (key: string) => setCart((c) => c.filter((it) => it.key !== key));

  const subtotal = cart.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.price) || 0;
    return sum + qty * price;
  }, 0);

  // ─── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: FormErrors = {};

    if (!customerName.trim()) errs.customerName = "Nama pemesan wajib diisi";
    if (!date) errs.date = "Tanggal wajib diisi";
    else if (isFutureDate(date)) errs.date = "Tanggal tidak boleh di masa depan";

    if (cart.length === 0) errs.cart = "Tambahkan minimal 1 item";

    const items = cart.map((it) => {
      const qty = parseFloat(it.quantity);
      const price = parseFloat(it.price);
      const product = PRODUCTS.find((p) => p.code === it.productCode)!;

      const stock = getStock(it.productCode);
      let itemErr = "";

      if (!it.quantity || isNaN(qty) || !isPositive(qty))
        itemErr = "Qty harus angka positif";
      else if (qty > stock.available)
        itemErr = `Stok tidak cukup (tersedia ${stock.available.toFixed(0)})`;

      if (!it.price || isNaN(price) || !isPositive(price))
        itemErr = itemErr || "Harga harus angka positif";

      return { it, product, qty, price, itemErr };
    });

    items.forEach(({ it, itemErr }) => {
      if (itemErr) errs[`qty_${it.key}`] = itemErr;
    });

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitLoading(true);
    try {
      await addSalesOrder({
        date,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        notes: notes.trim(),
        status: "pending",
        payStatus: "belum_lunas",
        pickupStatus: "belum_diambil",
        paidAmount: 0,
        items: items.map(({ it, product, qty, price }) => ({
          productCode: it.productCode,
          productName: product.name,
          quantity: qty,
          unit: product.unit,
          unitPrice: price,
          subtotal: qty * price,
        })),
      });
      // Reset form, keep date
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setNotes("");
      setErrors({});
    } catch {
      setErrors({ submit: "Gagal menyimpan transaksi. Coba lagi." });
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <Card title="Form Transaksi Penjualan" subtitle="Pemesanan / penjualan harian (Modul 3)">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header pesanan */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            type="date"
            label="Tanggal Transaksi"
            max={todayISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
          />
          <Input
            type="text"
            label="Nama Pemesan / Pembeli"
            placeholder="Contoh: Toko Ayam Sejahtera"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            error={errors.customerName}
          />
          <Input
            type="text"
            label="No. HP (opsional)"
            placeholder="08xx-xxxx-xxxx"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
        </div>

        {errors.cart && (
          <p className="text-sm text-red-600">{errors.cart}</p>
        )}

        {errors.submit && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {errors.submit}
          </p>
        )}

        {/* Item list */}
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-3 rounded-lg bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <div className="col-span-4">Kode Barang</div>
            <div className="col-span-2">Qty</div>
            <div className="col-span-3">Harga / unit</div>
            <div className="col-span-2 text-right">Subtotal</div>
            <div className="col-span-1" />
          </div>

          {cart.map((it) => {
            const qty = parseFloat(it.quantity) || 0;
            const price = parseFloat(it.price) || 0;
            const err = errors[`qty_${it.key}`];
            return (
              <div
                key={it.key}
                className="grid grid-cols-12 items-start gap-3 rounded-lg border border-gray-200 p-3"
              >
                <div className="col-span-4">
                  <Select
                    options={PRODUCTS.map((p) => ({ value: p.code, label: `${p.code} — ${p.name}` }))}
                    value={it.productCode}
                    onChange={(e) => updateItem(it.key, "productCode", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => updateItem(it.key, "quantity", e.target.value)}
                    error={err}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Harga"
                    value={it.price}
                    onChange={(e) => updateItem(it.key, "price", e.target.value)}
                  />
                </div>
                <div className="col-span-2 flex items-center justify-end pt-2 font-mono text-sm font-medium">
                  {formatRp(qty * price)}
                </div>
                <div className="col-span-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(it.key)}
                    className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Hapus item"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}

          {cart.length === 0 && (
            <p className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-sm text-gray-400">
              Belum ada item — klik "Tambah Item"
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={addItem}>
            + Tambah Item
          </Button>
          <div className="text-sm">
            <span className="text-gray-500">Subtotal: </span>
            <span className="text-lg font-bold text-gray-900">
              {formatRp(subtotal)}
            </span>
          </div>
        </div>

        <Input
          type="text"
          label="Catatan"
          placeholder="Contoh: Antar jam 06.00 pagi"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="submit" loading={submitLoading}>
            Simpan Transaksi
          </Button>
        </div>
      </form>
    </Card>
  );
}