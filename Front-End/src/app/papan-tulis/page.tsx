import { WhiteboardGrid } from "@/components/modules/WhiteboardGrid";

export default function PapanTulisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Papan Tulis Digital</h2>
        <p className="text-sm text-gray-500">
          Modul 2 — Katalog kode barang & stok siap jual real-time
        </p>
      </div>
      <WhiteboardGrid />
    </div>
  );
}