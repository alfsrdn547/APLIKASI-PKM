import * as XLSX from "xlsx";
import { PRODUCTS, DEFAULT_PRICES, EXPENSE_CATEGORIES, EXPENSE_DIRECTIONS, EXPENSE_SOURCES } from "@/constants/products";

// ─── Module types ──────────────────────────────────────────────────
export type ImportModule = "penerimaan" | "pemotongan" | "penjualan" | "pengeluaran";

export interface IncomingRow {
  date: string;
  chickenIn: number;
  chickenDead: number;
  chickenBroken: number;
  nopol: string;
  tonase: number;
  hargaPerKg: number;
  kasbon: number;
  notes: string;
}

export interface ButcheryRow {
  date: string;
  chickenCount: number;
  parts: { productCode: string; qtyKg: number }[];
  notes: string;
}

export interface SalesRow {
  date: string;
  customerName: string;
  customerPhone: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  payStatus: string;
  pickupStatus: string;
}

export interface ExpenseRow {
  date: string;
  category: string;
  direction: string;
  sourceFund: string;
  description: string;
  amount: number;
}

export type ParsedRow = IncomingRow | ButcheryRow | SalesRow | ExpenseRow;

// ─── KG products (for butchery template columns) ───────────────────
const KG_PRODUCTS = PRODUCTS.filter((p) => p.unit === "kg");

// ─── Header maps (Indonesia → camelCase) ───────────────────────────
const INCOMING_HEADERS = [
  { id: "tanggal", field: "date" as const },
  { id: "ayam_masuk", field: "chickenIn" as const },
  { id: "ayam_mati", field: "chickenDead" as const },
  { id: "ayam_cacat", field: "chickenBroken" as const },
  { id: "nopol", field: "nopol" as const },
  { id: "tonase_kg", field: "tonase" as const },
  { id: "harga_per_kg", field: "hargaPerKg" as const },
  { id: "kasbon", field: "kasbon" as const },
  { id: "catatan", field: "notes" as const },
];

const SALES_HEADERS = [
  { id: "tanggal", field: "date" as const },
  { id: "nama_pelanggan", field: "customerName" as const },
  { id: "telepon", field: "customerPhone" as const },
  { id: "kode_produk", field: "productCode" as const },
  { id: "nama_produk", field: "productName" as const },
  { id: "quantity", field: "quantity" as const },
  { id: "harga_satuan", field: "unitPrice" as const },
  { id: "status_bayar", field: "payStatus" as const },
  { id: "status_ambil", field: "pickupStatus" as const },
];

const EXPENSE_HEADERS = [
  { id: "tanggal", field: "date" as const },
  { id: "kategori", field: "category" as const },
  { id: "arah", field: "direction" as const },
  { id: "sumber", field: "sourceFund" as const },
  { id: "deskripsi", field: "description" as const },
  { id: "nominal", field: "amount" as const },
];

// ─── Template builder ──────────────────────────────────────────────
function buildIncomingSheet(): XLSX.WorkSheet {
  const headers = INCOMING_HEADERS.map((h) => h.id);
  const example = ["2026-09-15", 100, 2, 1, "B 1234 CD", 180, 38000, 0, "Contoh catatan"];
  const notes = [
    ["Format tanggal: YYYY-MM-DD", "", "", "", "", "", "", "", ""],
    ["Status: isi angka, kosong = 0", "", "", "", "", "", "", "", ""],
  ];
  return XLSX.utils.aoa_to_sheet([headers, example, ...notes]);
}

function buildButcherySheet(): XLSX.WorkSheet {
  const headers = ["tanggal", "jumlah_ekor", "catatan", ...KG_PRODUCTS.map((p) => p.code)];
  const example: (string | number)[] = ["2026-09-15", 50, "Contoh", ...KG_PRODUCTS.map(() => 0)];
  const notes = [
    [`Isi qty per produk kg (kolom kanan). Kosong = 0. Total qty > 0 minimal 1 kolom.`],
  ];
  return XLSX.utils.aoa_to_sheet([headers, example, ...notes]);
}

function buildSalesSheet(): XLSX.WorkSheet {
  const headers = SALES_HEADERS.map((h) => h.id);
  const example = ["2026-09-15", "Toko ABC", "0812xxxx", "BLD", "Boneless Dada", 10, DEFAULT_PRICES["BLD"] ?? 45000, "belum_lunas", "belum_diambil"];
  const notes = [
    ["Satu baris per item produk.", "Untuk 1 order, isi baris berbeda dgn tanggal+nama pelanggan yang SAMA.", "Harga satuan dari DEFAULT_PRICES.", "Status: lunas/belum_lunas | sudah_diambil/belum_diambil"],
  ];
  return XLSX.utils.aoa_to_sheet([headers, example, ...notes]);
}

function buildExpenseSheet(): XLSX.WorkSheet {
  const headers = EXPENSE_HEADERS.map((h) => h.id);
  const cats = EXPENSE_CATEGORIES.map((c) => c.value).join(", ");
  const dirs = EXPENSE_DIRECTIONS.map((d) => d.value).join(", ");
  const srcs = EXPENSE_SOURCES.map((s) => s.value).join(", ");
  const example = ["2026-09-15", "es_batu", "keluar", "kas", "Beli es batu 50kg", 75000];
  const notes = [
    [`Kategori: ${cats}`],
    [`Arah: ${dirs}`],
    [`Sumber: ${srcs}`],
  ];
  return XLSX.utils.aoa_to_sheet([headers, example, ...notes]);
}

export function buildTemplate(module: ImportModule): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  let ws: XLSX.WorkSheet;
  let name: string;
  switch (module) {
    case "penerimaan":
      ws = buildIncomingSheet(); name = "Penerimaan"; break;
    case "pemotongan":
      ws = buildButcherySheet(); name = "Pemotongan"; break;
    case "penjualan":
      ws = buildSalesSheet(); name = "Penjualan"; break;
    case "pengeluaran":
      ws = buildExpenseSheet(); name = "Pengeluaran"; break;
  }
  // column widths for readability
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  ws["!cols"] = Array.from({ length: range.e.c + 1 }, () => ({ wch: 16 }));
  XLSX.utils.book_append_sheet(wb, ws, name);
  return wb;
}

export function downloadTemplate(module: ImportModule) {
  const wb = buildTemplate(module);
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template-${module}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Parser ────────────────────────────────────────────────────────
function excelDateToISO(val: unknown): string {
  if (typeof val === "number" && val > 30 && val < 60000) {
    // Excel serial date: days since 1900-01-00
    const d = new Date((val - 25569) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  if (typeof val === "string") {
    // Accept YYYY-MM-DD or DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return String(val ?? "");
}

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function buildHeaderMap(headers: string[], spec: { id: string; field: string }[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
    const found = spec.find((s) => s.id === h);
    if (found) map[String.fromCharCode(65 + i)] = found.field; // col letter → field
  }
  return map;
}

function parseRows(rows: Record<string, unknown>[], headerMap: Record<string, string>): Record<string, unknown>[] {
  return rows.map((raw) => {
    const out: Record<string, unknown> = {};
    // re-key by field name using headerMap
    for (const colLetter of Object.keys(raw)) {
      const field = headerMap[colLetter];
      if (field) out[field] = raw[colLetter];
    }
    return out;
  });
}

export function parseXlsx(file: File, module: ImportModule): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        if (json.length === 0) { resolve([]); return; }

        // Build header mapping from first row's keys
        const firstRowKeys = Object.keys(json[0]);
        let spec: { id: string; field: string }[];
        switch (module) {
          case "penerimaan": spec = INCOMING_HEADERS; break;
          case "pemotongan": spec = [{ id: "tanggal", field: "date" }, { id: "jumlah_ekor", field: "chickenCount" }, { id: "catatan", field: "notes" }, ...KG_PRODUCTS.map((p) => ({ id: p.code.toLowerCase(), field: p.code }))]; break;
          case "penjualan": spec = SALES_HEADERS; break;
          case "pengeluaran": spec = EXPENSE_HEADERS; break;
        }
        const headerMap = buildHeaderMap(firstRowKeys, spec);

        // Map rows using header positions
        const mapped = parseRows(json, headerMap);

        switch (module) {
          case "penerimaan":
            resolve(mapped.map((r) => ({
              date: excelDateToISO(r.date),
              chickenIn: toNum(r.chickenIn),
              chickenDead: toNum(r.chickenDead),
              chickenBroken: toNum(r.chickenBroken),
              nopol: String(r.nopol ?? ""),
              tonase: toNum(r.tonase),
              hargaPerKg: toNum(r.hargaPerKg),
              kasbon: toNum(r.kasbon),
              notes: String(r.notes ?? ""),
            })) as IncomingRow[]);
            break;

          case "pemotongan":
            resolve(mapped.map((r) => {
              const parts = KG_PRODUCTS
                .map((p) => ({ productCode: p.code, qtyKg: toNum(r[p.code]) }))
                .filter((p) => p.qtyKg > 0);
              const chickenCount = toNum(r.chickenCount);
              return {
                date: excelDateToISO(r.date),
                chickenCount,
                parts,
                notes: String(r.notes ?? ""),
              } as ButcheryRow;
            }));
            break;

          case "penjualan":
            resolve(mapped.map((r) => ({
              date: excelDateToISO(r.date),
              customerName: String(r.customerName ?? ""),
              customerPhone: String(r.customerPhone ?? ""),
              productCode: String(r.productCode ?? ""),
              productName: String(r.productName ?? ""),
              quantity: toNum(r.quantity),
              unitPrice: toNum(r.unitPrice),
              payStatus: String(r.payStatus ?? "belum_lunas"),
              pickupStatus: String(r.pickupStatus ?? "belum_diambil"),
            })) as SalesRow[]);
            break;

          case "pengeluaran":
            resolve(mapped.map((r) => ({
              date: excelDateToISO(r.date),
              category: String(r.category ?? "lainnya"),
              direction: String(r.direction ?? "keluar"),
              sourceFund: String(r.sourceFund ?? "kas"),
              description: String(r.description ?? ""),
              amount: toNum(r.amount),
            })) as ExpenseRow[]);
            break;
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ─── Group sales rows into orders (by date + customerName) ─────────
export interface SalesOrderGroup {
  date: string;
  customerName: string;
  customerPhone: string;
  payStatus: string;
  pickupStatus: string;
  items: { productCode: string; productName: string; quantity: number; unitPrice: number }[];
}

export function groupSalesRows(rows: SalesRow[]): SalesOrderGroup[] {
  const map = new Map<string, SalesOrderGroup>();
  for (const r of rows) {
    const key = `${r.date}__${r.customerName}`;
    let order = map.get(key);
    if (!order) {
      order = {
        date: r.date,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        payStatus: r.payStatus || "belum_lunas",
        pickupStatus: r.pickupStatus || "belum_diambil",
        items: [],
      };
      map.set(key, order);
    }
    if (r.productCode && r.quantity > 0 && r.unitPrice > 0) {
      order.items.push({
        productCode: r.productCode,
        productName: r.productName || r.productCode,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
      });
    }
  }
  return Array.from(map.values()).filter((o) => o.items.length > 0);
}
