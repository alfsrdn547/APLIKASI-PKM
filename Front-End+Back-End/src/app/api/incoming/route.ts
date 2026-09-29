import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route, readJson } from "@/lib/apiResponse";
import { assertNotFuture } from "@/lib/validator";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

// GET /api/incoming
export const GET = route(async (req) => {
  await requireAuth(req, "read");
  const q = new URL(req.url).searchParams;
  let query = getAdminClient().from("incoming").select("*").order("date", { ascending: true });
  if (q.get("from")) query = query.gte("date", q.get("from")!);
  if (q.get("to")) query = query.lte("date", q.get("to")!);
  const { data, error } = await query;
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);
  return ok(data ?? []);
});

// POST /api/incoming
export const POST = route(async (req) => {
  await requireAuth(req, "write");
  const b = await readJson<any>(req);
  const date = b?.date, chickenIn = Number(b?.chickenIn), chickenDead = Number(b?.chickenDead ?? 0),
    chickenBroken = Number(b?.chickenBroken ?? 0),
    nopol = b?.nopol ?? "", tonase = Number(b?.tonase ?? 0),
    hargaPerKg = Number(b?.hargaPerKg ?? 0), kasbon = Number(b?.kasbon ?? 0),
    notes = b?.notes ?? "";

  assertNotFuture(date);
  if (!(chickenIn > 0)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { chickenIn: "Harus > 0" }, 400);
  if (chickenDead > chickenIn) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { chickenDead: "Mati melebihi masuk" }, 400);
  if (chickenBroken > chickenIn) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { chickenBroken: "Cacat melebihi masuk" }, 400);

  const { data, error } = await getAdminClient().from("incoming").insert({
    date, chicken_in: chickenIn, chicken_dead: chickenDead, chicken_broken: chickenBroken,
    nopol, tonase_kg: tonase, harga_per_kg: hargaPerKg,
    total_harga: Math.round(chickenIn * hargaPerKg * 100) / 100,
    kasbon, notes,
  }).select().single();
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);

  await writeAudit("POST", "/api/incoming", "incoming", data.id, "create", null, data, 201, req);
  return ok(data, 201);
});

// DELETE /api/incoming/[id]
export const DELETE = route(async (req, ctx: Ctx) => {
  await requireAuth(req, "write");
  const id = ctx.params.id;
  const { data: old } = await getAdminClient().from("incoming").select("*").eq("id", id).single();
  if (!old) throw new ApiError("NOT_FOUND", "Penerimaan tidak ditemukan", {}, 404);
  const { error } = await getAdminClient().from("incoming").delete().eq("id", id);
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);
  await writeAudit("DELETE", `/api/incoming/${id}`, "incoming", id, "delete", old, null, 204, req);
  return ok(null, 204);
});