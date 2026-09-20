import { getAdminClient } from "@/lib/supabase-server";
import { ok, fail, route, readJson } from "@/lib/apiResponse";
import { assertNotFuture } from "@/lib/validator";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/products — katalog 17 kode PRD
export const GET = route(async (req) => {
  await requireAuth(req, "read");
  const products = [
    { code: "PC", name: "Ayam Utuh Parting/Potong", unit: "kg", category: "ayam_utuh" },
    { code: "KRKS", name: "Karkas Utuh", unit: "kg", category: "ayam_utuh" },
    { code: "BLD", name: "Boneless Dada", unit: "kg", category: "daging" },
    { code: "BLD-K", name: "Boneless Dada Kulit", unit: "kg", category: "daging" },
    { code: "BLP", name: "Boneless Paha", unit: "kg", category: "daging" },
    { code: "BLP-K", name: "Boneless Paha Kulit", unit: "kg", category: "daging" },
    { code: "PAHA-P", name: "Paha (P)", unit: "kg", category: "daging" },
    { code: "PAHA-U", name: "Paha (U)", unit: "kg", category: "daging" },
    { code: "PAHA-A", name: "Paha (A)", unit: "kg", category: "daging" },
    { code: "SAYAP-B", name: "Sayap (B)", unit: "kg", category: "daging" },
    { code: "SAYAP-R", name: "Sayap (R)", unit: "kg", category: "daging" },
    { code: "CKR", name: "Cakar", unit: "kg", category: "sampingan" },
    { code: "KPL", name: "Kepala", unit: "ekor", category: "sampingan" },
    { code: "KULIT", name: "Kulit", unit: "kg", category: "sampingan" },
    { code: "USUS", name: "Usus", unit: "kg", category: "sampingan" },
    { code: "ATI", name: "Ati", unit: "kg", category: "sampingan" },
    { code: "TULANG", name: "Tulang", unit: "kg", category: "sampingan" },
  ];
  const prices: Record<string, number> = {
    PC: 38000, KRKS: 36000, BLD: 45000, "BLD-K": 46000, BLP: 40000, "BLP-K": 41000,
    "PAHA-P": 40000, "PAHA-U": 39000, "PAHA-A": 38000, "SAYAP-B": 25000, "SAYAP-R": 24000,
    CKR: 20000, KPL: 10000, KULIT: 15000, USUS: 12000, ATI: 25000, TULANG: 8000,
  };
  const dist: Record<string, number> = {
    PC: 0.55, KRKS: 0.55, BLD: 0.18, "BLD-K": 0.15, BLP: 0.15, "BLP-K": 0.12,
    "PAHA-P": 0.06, "PAHA-U": 0.05, "PAHA-A": 0.05, "SAYAP-B": 0.04, "SAYAP-R": 0.04,
    CKR: 0.04, KPL: 1, KULIT: 0.06, USUS: 0.03, ATI: 0.02, TULANG: 0.05,
  };
  return ok({
    products,
    defaultPrices: prices,
    butcheryDistribution: dist,
    avgWeightPerEkor: 1.8,
  });
});

// POST /api/products — (tidak dipakai; disediakan utk compat)
export const POST = route(async (req) => {
  const _ = await readJson(req);
  return fail(new Error("POST /products tidak diperlukan"));
});