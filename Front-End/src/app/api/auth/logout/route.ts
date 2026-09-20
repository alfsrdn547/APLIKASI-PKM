import { ok, route } from "@/lib/apiResponse";
import { SessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/logout
export const POST = route(async () => {
  const expired = `${SessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  return new Response(JSON.stringify({ data: {} }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": expired },
  });
});