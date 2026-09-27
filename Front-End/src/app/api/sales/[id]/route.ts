import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route, readJson } from "@/lib/apiResponse";
import { isOneOf, ORDER_STATUSES } from "@/lib/validator";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };
const idOf = (ctx: Ctx) => ctx.params.id;

// PATCH /api/sales/[id] — ubah status / pay / pickup / paid
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  await requireAuth(req, "write");
  const b = await readJson<any>(req);
  const id = idOf(ctx);

  const { data: old } = await getAdminClient().from("sales").select("*").eq("id", id).single();

  const patch: Record<string, unknown> = {};
  if (b?.status !== undefined) {
    if (!isOneOf(ORDER_STATUSES, b.status)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { status: "Tidak valid" }, 400);
    patch.status = b.status;
  }
  if (b?.payStatus !== undefined) patch.pay_status = b.payStatus;
  if (b?.pickupStatus !== undefined) patch.pickup_status = b.pickupStatus;
  if (b?.paidAmount !== undefined) patch.paid_amount = Number(b.paidAmount);

  if (Object.keys(patch).length === 0) throw new ApiError("VALIDATION_ERROR", "Tidak ada field diubah", {}, 400);

  const { data: updated, error } = await getAdminClient().from("sales").update(patch).eq("id", id).select().single();
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);

  await writeAudit("PATCH", `/api/sales/${id}`, "sales", id, "update", old, updated, 200, req);
  return ok(updated);
});

// DELETE /api/sales/[id] — hapus (sales_items cascade)
export const DELETE = route(async (req: Request, ctx: Ctx) => {
  await requireAuth(req, "write");
  const id = idOf(ctx);
  const { data: old } = await getAdminClient().from("sales").select("*").eq("id", id).single();
  if (!old) throw new ApiError("NOT_FOUND", "Penjualan tidak ditemukan", {}, 404);

  const { error } = await getAdminClient().from("sales").delete().eq("id", id);
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);

  await writeAudit("DELETE", `/api/sales/${id}`, "sales", id, "delete", old, null, 204, req);
  return ok(null, 204);
});