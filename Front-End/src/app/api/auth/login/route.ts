import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route, readJson } from "@/lib/apiResponse";
import { hashPassword, verifyPassword, createSessionToken, SessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

function sessionCookie(token: string): string {
  return `${SessionCookie}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200; ${
    process.env.NODE_ENV === "production" ? "Secure; " : ""
  }`;
}

/** Idempotent bootstrap: buat akun pemilik dari SEED_ADMIN_* bila belum ada user aktif. */
async function ensureSeed(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return;
  const { data: existing } = await getAdminClient().from("users").select("id").eq("email", email).maybeSingle();
  if (existing) return;
  await getAdminClient().from("users").insert({
    email,
    full_name: "Admin RPH",
    role: "pemilik",
    active: true,
    password_hash: hashPassword(password),
  });
}

// POST /api/auth/login
export const POST = route(async (req) => {
  const b = await readJson<{ email?: string; password?: string }>(req);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");
  if (!email || !password)
    throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { email: "Wajib diisi", password: "Wajib diisi" }, 400);

  await ensureSeed();

  const { data: user } = await getAdminClient()
    .from("users")
    .select("id,email,full_name,role,active,password_hash")
    .eq("email", email)
    .maybeSingle();
  if (!user || !user.password_hash || !verifyPassword(password, user.password_hash))
    throw new ApiError("INVALID_CREDENTIALS", "Email atau password salah", {}, 401);
  if (!user.active) throw new ApiError("ACCOUNT_DISABLED", "Akun dinonaktifkan", {}, 403);

  const sessionUser = { id: user.id, email: user.email, fullName: user.full_name ?? "", role: user.role };
  const token = createSessionToken(sessionUser);
  return new Response(JSON.stringify({ data: sessionUser }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": sessionCookie(token) },
  });
});