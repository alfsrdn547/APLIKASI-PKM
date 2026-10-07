import { route } from "@/lib/apiResponse";
import { getSession, SessionCookie } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// POST /api/auth/logout
// 1. Cabut sesi di server: token_valid_after = sekarang → token yang sudah
//    terbit (kalau dicuri sebelum logout) mati, bukan cuma cookie dihapus.
//    Best-effort: kalau kolom belum dimigrasi (SESSION_REVOKE.sql), error
//    Supabase diam-diam — logout tetap jalan (cookie dihapus).
// 2. Hapus cookie.
export const POST = route(async (req) => {
  const session = await getSession(req);
  if (session) {
    await getAdminClient()
      .from("users")
      .update({ token_valid_after: new Date().toISOString() })
      .eq("id", session.id);
  }

  const expired = `${SessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  return new Response(JSON.stringify({ data: {} }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": expired },
  });
});
