import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, route, readJson } from "@/lib/apiResponse";
import { hashPassword, verifyPassword, createSessionToken, SessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

function sessionCookie(token: string): string {
  return `${SessionCookie}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200; ${
    process.env.NODE_ENV === "production" ? "Secure; " : ""
  }`;
}

// ─── Rate limit login (per email, in-memory per instance) ──────────────
// ponytail: batas per-instance (Vercel bisa jalan multi-instance → lewat
// kalau diserang parallel). Cukup buat rem-brake brute force harian.
// Kalau perlu kuat: tabel DB atau Upstash (rate-limit per 15 menit, 10x).
const WINDOW_MS = 15 * 60_000;
const MAX_FAILS = 10;
const fails = new Map<string, { n: number; until: number }>();

function assertNotRateLimited(email: string): void {
  const a = fails.get(email);
  if (!a) return;
  if (a.until <= Date.now()) {
    fails.delete(email); // jendela habis → bersih
    return;
  }
  if (a.n >= MAX_FAILS)
    throw new ApiError(
      "RATE_LIMITED",
      "Terlalu banyak percobaan login. Coba lagi dalam 15 menit.",
      {},
      429
    );
}
function bumpFail(email: string): void {
  const now = Date.now();
  const a = fails.get(email);
  if (!a || a.until <= now) fails.set(email, { n: 1, until: now + WINDOW_MS });
  else a.n += 1;
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

  assertNotRateLimited(email);

  const { data: user, error } = await getAdminClient()
    .from("users")
    .select("id,email,full_name,role,active,password_hash")
    .eq("email", email)
    .maybeSingle();

  // Error DB (bukan sekadar user nggak ketemu) jangan disamarkan jadi
  // "password salah" — bedain supaya bug DB kelihatan.
  if (error) {
    console.error("[auth/login] query error:", error.message);
    throw new ApiError("DB_ERROR", "Gagal memvalidasi akun", {}, 500);
  }

  if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
    bumpFail(email);
    throw new ApiError("INVALID_CREDENTIALS", "Email atau password salah", {}, 401);
  }
  if (!user.active) throw new ApiError("ACCOUNT_DISABLED", "Akun dinonaktifkan", {}, 403);

  fails.delete(email); // sukses → reset hitungan

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
