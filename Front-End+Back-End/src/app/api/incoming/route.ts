import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route, readJson, field, num } from "@/lib/apiResponse";
import { assertNotFuture } from "@/lib/validator";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
  // Terima camelCase (app) DAN snake_case (curl/manual). Tanpa ini,
  // `chicken_in` jadi undefined → Number() = NaN → 400 dengan pesan
  // "Harus > 0" yang jauh dari penyebab sebenarnya.
  const date = b?.date;
  const chickenIn = num(b, "chickenIn", "chicken_in");
  const chickenDead = num(b, "chickenDead", "chicken_dead");
  const chickenBroken = num(b, "chickenBroken", "chicken_broken");
  const nopol = field(b, "nopol") ?? "";
  const tonase = num(b, "tonase", "tonase_kg");
  const hargaPerKg = num(b, "hargaPerKg", "harga_per_kg");
  const kasbon = num(b, "kasbon");
  const notes = field(b, "notes") ?? "";

  assertNotFuture(date);
  if (!Number.isFinite(chickenIn) || !(chickenIn > 0))
    throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { chickenIn: "Harus angka > 0" }, 400);
  if (chickenDead > chickenIn) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { chickenDead: "Mati melebihi masuk" }, 400);
  if (chickenBroken > chickenIn) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { chickenBroken: "Cacat melebihi masuk" }, 400);

  const { data, error } = await getAdminClient().from("incoming").insert({
    date, chicken_in: chickenIn, chicken_dead: chickenDead, chicken_broken: chickenBroken,
    nopol, tonase_kg: tonase, harga_per_kg: hargaPerKg,
    // Kolom DB bernama "harga_per_kg" tapi isinya harga PER EKOR (label UI
    // sudah disesuaikan). Rumus: ekor × harga_per_ekor.
    total_harga: Math.round(chickenIn * hargaPerKg * 100) / 100,
    kasbon, notes,
  }).select().single();
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);

  await writeAudit("POST", "/api/incoming", "incoming", data.id, "create", null, data, 201, req);
  return ok(data, 201);
});

// DELETE /api/incoming/[id] → ditangani di ./[id]/route.ts