import { IncomingForm } from "@/components/modules/IncomingForm";
import { IncomingTable } from "@/components/modules/IncomingTable";

export default function PenerimaanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Penerimaan & Produksi</h2>
        <p className="text-sm text-gray-500">
          Modul 1 — Input barang datang (surat jalan) & stok siap produksi
        </p>
      </div>
      <IncomingForm />
      <IncomingTable />
    </div>
  );
}