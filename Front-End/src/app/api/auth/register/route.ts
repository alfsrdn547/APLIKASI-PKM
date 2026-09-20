import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route, readJson } from "@/lib/apiResponse";
import { hashPassword, verifyPassword, createSessionToken, SessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TEAM_ROLES = ["operator", "pemilik"] as const;

function cookie(token: string) {
  return `${SessionCookie}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200; ${
    process.env.NODE_ENV === "production" ? "Secure; " : ""
  }`;
}

// POST /api/auth/register — invite-only, token dibanding dgn bcrypt INVITE_TOKEN
export const POST = route(async (req) => {
  const b = await readJson<{
    email?: string;
    fullName?: string;
    password?: string;
    role?: "operator" | "pemilik";
    inviteToken?: string;
  }>(req);

  const email = String(b?.email ?? "").trim().toLowerCase();
  const fullName = String(b?.fullName ?? "").trim();
  const password = String(b?.password ?? "");
  const role = b?.role ?? "operator";
  const inviteToken = String(b?.inviteToken ?? "");

  const fields: Record<string, string> = {};
  if (!email) fields.email = "Wajib diisi";
  if (!fullName) fields.fullName = "Wajib diisi";
  if (password.length < 6) fields.password = "Minimal 6 karakter";
  if (!TEAM_ROLES.includes(role as any)) fields.role = "Role tidak valid";
  if (!inviteToken) fields.inviteToken = "Token undangan wajib";
  if (Object.keys(fields).length) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", fields, 400);

  const inviteHash = process.env.INVITE_TOKEN_HASH;
  if (!inviteHash || !verifyPassword(inviteToken, inviteHash))
    throw new ApiError("INVALID_INVITE", "Token undangan salah", {}, 403);

  const { data: dup } = await getAdminClient().from("users").select("id").eq("email", email).maybeSingle();
  if (dup) throw new ApiError("EMAIL_EXISTS", "Email sudah terdaftar", { email: "Sudah dipakai" }, 409);

  const { data, error } = await getAdminClient()
    .from("users")
    .insert({ email, full_name: fullName, role, active: true, password_hash: hashPassword(password) })
    .select("id,email,full_name,role")
    .single();
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);

  const user = { id: data.id, email: data.email, fullName: data.full_name ?? "", role: data.role };
  const token = createSessionToken(user);
  return new Response(JSON.stringify({ data: user }), {
    status: 201,
    headers: { "Content-Type": "application/json", "Set-Cookie": cookie(token) },
  });
});