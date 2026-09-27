import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, route, readJson } from "@/lib/apiResponse";
import { hashPassword, verifyPassword, createSessionToken, SessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

function sessionCookie(token: string): string {
  return `${SessionCookie}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200; ${
    process.env.NODE_ENV === "production" ? "Secure; " : ""
  }`;
}

// POST /api/auth/login — email + password, semua role.
export const POST = route(async (req) => {
  const b = await readJson<{ email?: string; password?: string }>(req);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");

  const fields: Record<string, string> = {};
  if (!email) fields.email = "Email wajib diisi";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "Format email tidak valid";
  if (!password) fields.password = "Password wajib diisi";
  if (Object.keys(fields).length) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", fields, 400);

  const { data: user } = await getAdminClient()
    .from("users")
    .select("id,email,full_name,role,active,password_hash")
    .eq("email", email)
    .maybeSingle();

  if (!user || !user.password_hash || !verifyPassword(password, user.password_hash))
    throw new ApiError("INVALID_CREDENTIALS", "Email atau password salah", {}, 401);
  if (!user.active) throw new ApiError("ACCOUNT_DISABLED", "Akun dinonaktifkan", {}, 403);

  const sessionUser = {
    id: user.id,
    email: user.email,
    fullName: user.full_name ?? "",
    role: user.role,
  };
  const token = createSessionToken(sessionUser);
  return new Response(JSON.stringify({ data: sessionUser }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(token) },
  });
});
