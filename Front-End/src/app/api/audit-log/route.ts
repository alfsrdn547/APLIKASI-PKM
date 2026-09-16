import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

// GET /api/audit-log?entity=
export const GET = route(async (req) => {
  const q = new URL(req.url).searchParams;
  let query = getAdminClient().from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
  if (q.get("entity")) query = query.eq("entity", q.get("entity")!);
  const { data, error } = await query;
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);
  return ok(data ?? []);
});