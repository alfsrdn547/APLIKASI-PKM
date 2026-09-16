import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route } from "@/lib/apiResponse";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

// DELETE /api/incoming/[id]
export const DELETE = route(async (_req, ctx: Ctx) => {
  const id = ctx.params.id;
  const { data: old } = await getAdminClient().from("incoming").select("*").eq("id", id).single();
  if (!old) throw new ApiError("NOT_FOUND", "Penerimaan tidak ditemukan", {}, 404);
  const { error } = await getAdminClient().from("incoming").delete().eq("id", id);
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);
  await writeAudit("DELETE", `/api/incoming/${id}`, "incoming", id, "delete", old, null, 204);
  return ok(null, 204);
});