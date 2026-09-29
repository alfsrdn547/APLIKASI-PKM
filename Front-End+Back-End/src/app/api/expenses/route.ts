import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route, readJson } from "@/lib/apiResponse";
import { assertNotFuture, isOneOf, EXPENSE_CATEGORIES, EXPENSE_DIRECTIONS, EXPENSE_SOURCES } from "@/lib/validator";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

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
  const date = b?.date, category = b?.category, description = b?.description ?? "",
    direction = b?.direction ?? "keluar", sourceFund = b?.sourceFund ?? "kas",
    amount = Number(b?.amount);

  assertNotFuture(date);
  if (!isOneOf(EXPENSE_CATEGORIES, category)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { category: "Kategori tidak valid" }, 400);
  if (!isOneOf(EXPENSE_DIRECTIONS, direction)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { direction: "Arah tidak valid" }, 400);
  if (!isOneOf(EXPENSE_SOURCES, sourceFund)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { sourceFund: "Sumber tidak valid" }, 400);
  if (!description.trim()) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { description: "Wajib diisi" }, 400);
  if (!(amount > 0)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { amount: "Nominal harus > 0" }, 400);

  const { data, error } = await getAdminClient().from("expenses").insert({
    date, category, direction, source_fund: sourceFund, description, amount,
  }).select().single();
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);

  await writeAudit("POST", "/api/expenses", "expenses", data.id, "create", null, data, 201, req);
  return ok(data, 201);
});

// DELETE /api/expenses/[id]
export const DELETE = route(async (req, ctx: Ctx) => {
  await requireAuth(req, "write");
  const id = ctx.params.id;
  const { data: old } = await getAdminClient().from("expenses").select("*").eq("id", id).single();
  if (!old) throw new ApiError("NOT_FOUND", "Pengeluaran tidak ditemukan", {}, 404);
  const { error } = await getAdminClient().from("expenses").delete().eq("id", id);
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);
  await writeAudit("DELETE", `/api/expenses/${id}`, "expenses", id, "delete", old, null, 204, req);
  return ok(null, 204);
});