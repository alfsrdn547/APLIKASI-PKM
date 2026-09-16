import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route, readJson } from "@/lib/apiResponse";
import { assertNotFuture } from "@/lib/validator";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

const KG_CODES = [
  "PC","KRKS","BLD","BLD-K","BLP","BLP-K","PAHA-P","PAHA-U","PAHA-A",
  "SAYAP-B","SAYAP-R","CKR","KULIT","USUS","ATI","TULANG",
];

// GET /api/butchery
export const GET = route(async (req) => {
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
  const b = await readJson<any>(req);
  const date = b?.date, chickenCount = Number(b?.chickenCount), notes = b?.notes ?? "";
  const incomingId = b?.incomingId ?? null;
  const parts: any[] = Array.isArray(b?.parts) ? b.parts : [];

  assertNotFuture(date);
  if (!(chickenCount >= 1)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { chickenCount: "Minimal 1 ekor" }, 400);
  if (parts.length === 0) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { parts: "Minimal 1 bagian" }, 400);

  const clean = parts
    .map((p) => ({ productCode: String(p.productCode ?? ""), qtyKg: Number(p.qtyKg) }))
    .filter((p) => p.qtyKg > 0 && p.productCode);
  if (clean.length === 0) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { parts: "Minimal 1 bagian qty>0" }, 400);
  for (const p of clean) {
    if (!KG_CODES.includes(p.productCode))
      throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { [`parts.${p.productCode}`]: "Kode tidak dikenal / bukan kg" }, 400);
  }

  const { data, error } = await getAdminClient().from("butchery").insert({
    date, incoming_id: incomingId, chicken_count: chickenCount, parts: clean, notes,
  }).select().single();
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);

  await writeAudit("POST", "/api/butchery", "butchery", data.id, "create", null, data, 201);
  return ok(data, 201);
});

// DELETE /api/butchery/[id]
export const DELETE = route(async (_req, ctx: Ctx) => {
  const id = ctx.params.id;
  const { data: old } = await getAdminClient().from("butchery").select("*").eq("id", id).single();
  if (!old) throw new ApiError("NOT_FOUND", "Pemotongan tidak ditemukan", {}, 404);
  const { error } = await getAdminClient().from("butchery").delete().eq("id", id);
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);
  await writeAudit("DELETE", `/api/butchery/${id}`, "butchery", id, "delete", old, null, 204);
  return ok(null, 204);
});