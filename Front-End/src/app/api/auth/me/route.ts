import { ok, route } from "@/lib/apiResponse";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/me
export const GET = route(async (req) => {
  const user = await requireAuth(req, "read");
  return ok(user);
});