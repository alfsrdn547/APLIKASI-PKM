import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route, readJson, field, num } from "@/lib/apiResponse";
import { assertNotFuture, isOneOf, EXPENSE_CATEGORIES, EXPENSE_DIRECTIONS } from "@/lib/validator";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/expenses
export const GET = route(async (req) => {
  await requireAuth(req, "read");
  const q = new URL(req.url).searchParams;
  let query = getAdminClient().from("expenses").select("*").order("date", { ascending: true });
  if (q.get("from")) query = query.gte("date", q.get("from")!);
  if (q.get("to")) query = query.lte("date", q.get("to")!);
  if (q.get("category")) query = query.eq("category", q.get("category")!);
  const { data, error } = await query;
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);
  return ok(data ?? []);
});

// POST /api/expenses
export const POST = route(async (req) => {
  await requireAuth(req, "write");
  const b = await readJson<any>(req);
  const date = b?.date,
    category = field(b, "category"),
    description = field(b, "description") ?? "",
    direction = field(b, "direction") ?? "keluar",
    sourceFund = String(field(b, "sourceFund", "source_fund") ?? "").trim(),
    amount = num(b, "amount");

  assertNotFuture(date);
  if (!isOneOf(EXPENSE_CATEGORIES, category)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { category: "Kategori tidak valid" }, 400);
  if (!isOneOf(EXPENSE_DIRECTIONS, direction)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { direction: "Arah tidak valid" }, 400);
  // Sumber uang = teks bebas (bukan enum), asal tidak kosong.
  if (!sourceFund) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { sourceFund: "Wajib diisi" }, 400);
  if (!description.trim()) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { description: "Wajib diisi" }, 400);
  if (!Number.isFinite(amount) || !(amount > 0))
    throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { amount: "Nominal harus angka > 0" }, 400);

  const { data, error } = await getAdminClient().from("expenses").insert({
    date, category, direction, source_fund: sourceFund, description, amount,
  }).select().single();
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);

  await writeAudit("POST", "/api/expenses", "expenses", data.id, "create", null, data, 201, req);
  return ok(data, 201);
});

// DELETE /api/expenses/[id] → ditangani di ./[id]/route.ts