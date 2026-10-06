import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route, readJson, field, num } from "@/lib/apiResponse";
import { assertNotFuture } from "@/lib/validator";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";
import { KG_CODES } from "@/constants/products";

export const dynamic = "force-dynamic";

// GET /api/butchery
export const GET = route(async (req) => {
  await requireAuth(req, "read");
  const q = new URL(req.url).searchParams;
  let query = getAdminClient().from("butchery").select("*").order("date", { ascending: true });
  if (q.get("from")) query = query.gte("date", q.get("from")!);
  if (q.get("to")) query = query.lte("date", q.get("to")!);
  const { data, error } = await query;
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);
  return ok(data ?? []);
});

// POST /api/butchery
export const POST = route(async (req) => {
  await requireAuth(req, "write");
  const b = await readJson<any>(req);
  const date = b?.date,
    chickenCount = num(b, "chickenCount", "chicken_count"),
    notes = field(b, "notes") ?? "";
  const incomingId = field(b, "incomingId", "incoming_id") ?? null;
  const parts: any[] = Array.isArray(b?.parts) ? b.parts : [];

  assertNotFuture(date);
  if (!Number.isFinite(chickenCount) || !(chickenCount >= 1))
    throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { chickenCount: "Minimal 1 ekor" }, 400);
  if (parts.length === 0) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { parts: "Minimal 1 bagian" }, 400);

  const clean = parts
    .map((p: any) => ({
      productCode: String(field(p, "productCode", "product_code") ?? ""),
      qtyKg: num(p, "qtyKg", "qty_kg"),
      // Harga/kg manual operator — jsonb, tanpa migrasi. 0 = tidak diisi.
      priceKg: num(p, "priceKg", "price_kg"),
    }))
    .map((p: any) => ({ ...p, priceKg: Math.max(0, Math.round(p.priceKg * 100) / 100) }))
    .filter((p: any) => p.qtyKg > 0 && p.productCode);
  if (clean.length === 0) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { parts: "Minimal 1 bagian qty>0" }, 400);
  for (const p of clean) {
    if (!KG_CODES.includes(p.productCode))
      throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { [`parts.${p.productCode}`]: "Kode tidak dikenal / bukan kg" }, 400);
  }

  const { data, error } = await getAdminClient().from("butchery").insert({
    date, incoming_id: incomingId, chicken_count: chickenCount, parts: clean, notes,
  }).select().single();
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);

  await writeAudit("POST", "/api/butchery", "butchery", data.id, "create", null, data, 201, req);
  return ok(data, 201);
});

// DELETE /api/butchery/[id] → ditangani di ./[id]/route.ts