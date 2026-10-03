import { ExpensesModule } from "@/components/modules/ExpensesModule";

export default function PengeluaranPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Transaksi & Pengeluaran Operasional</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Modul 3 — Catat beban produksi harian (es batu, borongan, harian, admin, konsumsi, supir)
        </p>
      </div>
      <ExpensesModule />
    </div>
  );
}