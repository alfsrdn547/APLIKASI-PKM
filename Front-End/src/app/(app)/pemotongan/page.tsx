import { ButcherForm } from "@/components/modules/ButcherForm";
import { ButcheryHistory } from "@/components/modules/ButcheryHistory";

export default function PemotonganPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Pemotongan Manual</h2>
        <p className="text-sm text-gray-500">
          Modul 2 — Potong ayam jadi potongan timbang; hasilnya jadi sumber stok Papan Tulis
        </p>
      </div>
      <ButcherForm />
      <ButcheryHistory />
    </div>
  );
}