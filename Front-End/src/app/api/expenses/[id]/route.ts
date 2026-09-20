import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route } from "@/lib/apiResponse";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

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