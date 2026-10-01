import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route } from "@/lib/apiResponse";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";
// Next.js 15+: `params` itu Promise. Tanpa await → undefined → 404 palsu.
type Ctx = { params: Promise<{ id: string }> };

// DELETE /api/expenses/[id]
export const DELETE = route(async (req, ctx: Ctx) => {
  await requireAuth(req, "write");
  const id = (await ctx.params).id;
  const { data: old, error: oldErr } = await getAdminClient()
    .from("expenses").select("*").eq("id", id).maybeSingle();
  if (oldErr) throw new ApiError("DB_ERROR", "Gagal memuat pengeluaran", {}, 500);
  if (!old) throw new ApiError("NOT_FOUND", "Pengeluaran tidak ditemukan", {}, 404);
  const { error } = await getAdminClient().from("expenses").delete().eq("id", id);
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);
  await writeAudit("DELETE", `/api/expenses/${id}`, "expenses", id, "delete", old, null, 204, req);
  return ok(null, 204);
});