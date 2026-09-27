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
// Sheet "Import" = HANYA header (row 1). Parser membaca sheet pertama;
// selain row 1 akan dianggap baris data, jadi tak ada contoh di sini.
function buildImportSheet(fields: { header: string }[]): { ws: XLSX.WorkSheet; headers: string[] } {
  const headers = fields.map((f) => f.header);
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  return { ws, headers };
}

// Dropdown data-validation untuk kolom enum (Excel/Sheets).
function addDropdown(ws: XLSX.WorkSheet, colLetter: string, values: string[], rowStart = 2, rowEnd = 1000): void {
  if (!ws["!dataValidation"]) ws["!dataValidation"] = [];
  ws["!dataValidation"].push({
    type: "list",
    allowBlank: true,
    formula1: `"${values.join(",")}"`,
    ranges: [{ sheet: 0, from: { r: rowStart - 1, c: XLSX.utils.decode_col(colLetter) }, to: { r: rowEnd - 1, c: XLSX.utils.decode_col(colLetter) } }],
  });
}

function buildIncomingSheet() {
  return buildImportSheet([
    { header: "tanggal" },
    { header: "ayam_masuk" },
    { header: "ayam_mati" },
    { header: "ayam_cacat" },
    { header: "nopol" },
    { header: "tonase_kg" },
    { header: "harga_per_kg" },
    { header: "kasbon" },
    { header: "catatan" },
  ]);
}

function buildButcherySheet() {
  return buildImportSheet([
    { header: "tanggal" },
    { header: "jumlah_ekor" },
    { header: "catatan" },
    ...KG_PRODUCTS.map((p) => ({ header: p.code })),
  ]);
}

function buildSalesSheet() {
  const { ws, headers } = buildImportSheet([
    { header: "tanggal" },
    { header: "nama_pelanggan" },
    { header: "telepon" },
    { header: "kode_produk" },
    { header: "nama_produk" },
    { header: "quantity" },
    { header: "harga_satuan" },
    { header: "status_bayar" },
    { header: "status_ambil" },
  ]);
  addDropdown(ws, "H", ["lunas", "belum_lunas"]);
  addDropdown(ws, "I", ["sudah_diambil", "belum_diambil"]);
  return { ws, headers };
}

function buildExpenseSheet() {
  const { ws, headers } = buildImportSheet([
    { header: "tanggal" },
    { header: "kategori" },
    { header: "arah" },
    { header: "sumber" },
    { header: "deskripsi" },
    { header: "nominal" },
  ]);
  addDropdown(ws, "B", EXPENSE_CATEGORIES.map((c) => c.value));
  addDropdown(ws, "C", EXPENSE_DIRECTIONS.map((d) => d.value));
  addDropdown(ws, "D", EXPENSE_SOURCES.map((s) => s.value));
  return { ws, headers };
}

// Sheet panduan (tidak dibaca parser — hanya sheet pertama "Import" yang diparse).
function buildGuideSheet(module: ImportModule): XLSX.WorkSheet {
  const rows: string[][] = [
    ["CARA IMPOR DATA — " + module.toUpperCase()],
    [],
    ["1. Isi kolom di sheet 'Import' sesuai baris pertama (header). Jangan ubah nama header."],
    ["2. Format tanggal: YYYY-MM-DD (contoh 2026-09-15). Tanggal masa depan otomatis ditolak."],
  ];

  switch (module) {
    case "penerimaan":
      rows.push(
        ["3. Kolom isi: tanggal · ayam_masuk (ekor) · ayam_mati · ayam_cacat · nopol · tonase_kg · harga_per_kg · kasbon · catatan."],
        ["4. Angka kosong dianggap 0, kecuali ayam_masuk wajib > 0."],
        ["5. Contoh baris: 2026-09-15 | 100 | 2 | 1 | B 1234 CD | 180 | 38000 | 0 | Catatan opsional"],
        ["6. Satu baris = satu penerimaan."]
      );
      break;
    case "pemotongan":
      rows.push(
        ["3. 'jumlah_ekor' = jumlah ayam dipotong hari itu."],
        ["4. Isi qty (kg) di kolom kode produk. Kosong = 0. Minimal satu kolom qty > 0."],
        ["5. Kode produk valid (kg): " + KG_PRODUCTS.map((p) => `${p.code} (${p.name})`).join(", ") + "."],
        ["6. Contoh baris: 2026-09-15 | 50 | (catatan) | BLD: 9 | KRKS: 18 | (sisanya 0)"],
        ["7. Satu baris = satu pemotongan."]
      );
      break;
    case "penjualan":
      rows.push(
        ["3. SATU BARIS = SATU ITEM PRODUK. Untuk satu order dengan 2 jenis barang, tulis 2 baris dengan tanggal & nama pelanggan yang SAMA."],
        ["4. 'kode_produk' wajib ada di katalog. 'nama_produk' bisa dikosongkan (diisi otomatis)."],
        ["5. 'quantity' & 'harga_satuan' harus > 0. Total order dihitung otomatis."],
        ["6. 'status_bayar': lunas / belum_lunas. 'status_ambil': sudah_diambil / belum_diambil (dropdown tersedia)."],
        ["7. Contoh (2 baris = 1 order 2 item):"],
        ["   2026-09-15 | Toko ABC | 0812xxxx | BLD | | 10 | 45000 | belum_lunas | belum_diambil"],
        ["   2026-09-15 | Toko ABC | 0812xxxx | CKR | | 5  | 20000 | belum_lunas | belum_diambil"],
        ["8. Sistem cek stok otomatis; kalau stok kurang baris ditolak."]
      );
      break;
    case "pengeluaran":
      rows.push(
        ["3. 'kategori', 'arah', 'sumber' harus pilihan yang tersedia (dropdown tersedia):"],
        ["   kategori: " + EXPENSE_CATEGORIES.map((c) => c.value).join(", ")],
        ["   arah: keluar / masuk · sumber: kas / bank / lainnya"],
        ["4. 'deskripsi' wajib. 'nominal' harus > 0."],
        ["5. Contoh baris: 2026-09-15 | es_batu | keluar | kas | Beli es batu 50kg | 75000"],
        ["6. Satu baris = satu pengeluaran."]
      );
      break;
  }
  rows.push([], ["Setelah selesai isi, simpan & upload file ini lewat menu 'Import Data'."]);
  return XLSX.utils.aoa_to_sheet(rows);
}

export function buildTemplate(module: ImportModule): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Sheet 1 "Import" — hanya header (parser baca sheet pertama).
  let headers: string[];
  let ws: XLSX.WorkSheet;
  switch (module) {
    case "penerimaan":       ({ ws, headers } = buildIncomingSheet()); break;
    case "pemotongan":       ({ ws, headers } = buildButcherySheet()); break;
    case "penjualan":        ({ ws, headers } = buildSalesSheet()); break;
    case "pengeluaran":      ({ ws, headers } = buildExpenseSheet()); break;
  }

  // Freeze header + filter autofilter + trap header jangan diubah.
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }) };
  // Col widths.
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  ws["!cols"] = Array.from({ length: Math.max(range.e.c + 1, headers.length) }, () => ({ wch: 16 }));

  XLSX.utils.book_append_sheet(wb, ws, "Import");

  // Sheet 2 "Cara Pakai" — panduan user (tak diparse).
  const guide = buildGuideSheet(module);
  const gr = XLSX.utils.decode_range(guide["!ref"] ?? "A1");
  guide["!cols"] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, guide, "Cara Pakai");
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
