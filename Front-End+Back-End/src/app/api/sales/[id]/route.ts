import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route, readJson } from "@/lib/apiResponse";
import { isOneOf, ORDER_STATUSES, PAY_STATUSES, PICKUP_STATUSES } from "@/lib/validator";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
// Next.js 15+: `params` itu Promise, bukan object. `ctx.params.id` tanpa
// await = undefined (diam-diam), bikin query 0 baris → 404 palsu.
type Ctx = { params: Promise<{ id: string }> };
const idOf = async (ctx: Ctx) => (await ctx.params).id;

// PATCH /api/sales/[id] — ubah status / pay / pickup / paid
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  await requireAuth(req, "write");
  const b = await readJson<any>(req);
  const id = await idOf(ctx);

  const { data: old, error: oldErr } = await getAdminClient()
    .from("sales")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (oldErr) {
    console.error(`[sales/${id}] select error:`, oldErr.message);
    throw new ApiError("DB_ERROR", "Gagal memuat transaksi", {}, 500);
  }
  if (!old) throw new ApiError("NOT_FOUND", "Penjualan tidak ditemukan", {}, 404);

  const patch: Record<string, unknown> = {};
  if (b?.status !== undefined) {
    if (!isOneOf(ORDER_STATUSES, b.status)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { status: "Tidak valid" }, 400);
    patch.status = b.status;
  }
  if (b?.payStatus !== undefined) {
    if (!isOneOf(PAY_STATUSES, b.payStatus)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { payStatus: "Tidak valid" }, 400);
    patch.pay_status = b.payStatus;
  }
  if (b?.pickupStatus !== undefined) {
    if (!isOneOf(PICKUP_STATUSES, b.pickupStatus)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { pickupStatus: "Tidak valid" }, 400);
    patch.pickup_status = b.pickupStatus;
  }
  if (b?.paidAmount !== undefined) {
    const paid = Number(b.paidAmount);
    if (!isFinite(paid) || paid < 0) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { paidAmount: "Harus angka ≥ 0" }, 400);
    patch.paid_amount = paid;
  }

  if (Object.keys(patch).length === 0) throw new ApiError("VALIDATION_ERROR", "Tidak ada field diubah", {}, 400);

  // `.maybeSingle()`: 0 baris ke-update → null (bukan error), biar bisa
  // dibedakan dari DB error dan dikasih 404 yang tepat.
  const { data: updated, error } = await getAdminClient()
    .from("sales")
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);
  if (!updated) throw new ApiError("NOT_FOUND", "Penjualan tidak ditemukan", {}, 404);

  await writeAudit("PATCH", `/api/sales/${id}`, "sales", id, "update", old, updated, 200, req);
  return ok(updated);
});

// DELETE /api/sales/[id] — hapus (sales_items cascade)
export const DELETE = route(async (req: Request, ctx: Ctx) => {
  await requireAuth(req, "write");
  const id = await idOf(ctx);
  const { data: old, error: oldErr } = await getAdminClient()
    .from("sales")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (oldErr) {
    console.error(`[sales/${id}] select error:`, oldErr.message);
    throw new ApiError("DB_ERROR", "Gagal memuat transaksi", {}, 500);
  }
  if (!old) throw new ApiError("NOT_FOUND", "Penjualan tidak ditemukan", {}, 404);

  const { error } = await getAdminClient().from("sales").delete().eq("id", id);
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);

  await writeAudit("DELETE", `/api/sales/${id}`, "sales", id, "delete", old, null, 204, req);
  return ok(null, 204);
});