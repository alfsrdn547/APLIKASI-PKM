import {
  createHmac,
  timingSafeEqual,
  scryptSync,
  randomBytes,
} from "node:crypto";
import { getAdminClient } from "./supabase-server";
import { ApiError } from "./apiResponse";

// ─── Auth: JWT-ish session (httpOnly cookie), stateless. ───────────────────
// Pakai node:crypto (HMAC-SHA256 + scrypt) — tanpa dependency eksternal,
// jalan di Vercel Functions.

const COOKIE = "session";

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (s) return s;
  // Di produksi secret yang hilang = sesi ditandatangani pakai string publik.
  // Fail keras, jangan diam-diam pakai fallback dev.
  if (process.env.NODE_ENV === "production")
    throw new Error("JWT_SECRET belum di-set");
  return "dev-secret-jangan-pakai-di-produksi";
}

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: "operator" | "pemilik";
};

const TOKEN_TTL = 12 * 60 * 60; // detik

/** B64url tanpa padding. */
function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}
function b64urls(s: string): string {
  return b64url(Buffer.from(s));
}

export function createSessionToken(user: SessionUser): string {
  const header = b64urls(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64urls(
    JSON.stringify({ sub: user.id, role: user.role, iat: now, exp: now + TOKEN_TTL })
  );
  const msg = `${header}.${payload}`;
  const sig = createHmac("sha256", secret()).update(msg).digest("base64url");
  return `${msg}.${sig}`;
}

/** Parse & verify JWT-ish token; kembalikan payload atau null. */
export function verifyToken(token: string): { sub?: string; role?: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = createHmac("sha256", secret()).update(`${header}.${payload}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof p.exp !== "number" || p.exp < Math.floor(Date.now() / 1000)) return null;
    return p;
  } catch {
    return null;
  }
}

/** Parse cookie header minimal (tanpa middleware). */
export function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.get("cookie") ?? "";
  const out: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

export const SessionCookie = COOKIE;

/** Ambil actor dari cookie request — null kalau tidak/auth invalid. */
export async function getSession(req: Request): Promise<SessionUser | null> {
  const token = parseCookies(req)[COOKIE];
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload?.sub) return null;
  try {
    const { data } = await getAdminClient()
      .from("users")
      .select("id,email,full_name,role,active,phone")
      .eq("id", payload.sub)
      .single();
    if (!data || !data.active) return null;
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name ?? "",
      role: data.role === "pemilik" ? "pemilik" : "operator",
    };
  } catch {
    return null;
  }
}

/** Hash & verify password via scrypt (node:crypto). Format: scrypt$salt$hash. */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 32);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}
export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [algo, saltB64, hashB64] = stored.split("$");
    if (algo !== "scrypt") return false;
    const hash = scryptSync(plain, Buffer.from(saltB64, "base64"), 32);
    const a = Buffer.from(hashB64, "base64");
    const b = hash;
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Require auth.
 *  read  → semua role
 *  write → operator saja (pemilik read-only pada data)
 *  admin → pemilik saja (kelola operator:odied, bukan data) */
export async function requireAuth(
  req: Request,
  mode: "read" | "write" | "admin" = "read"
): Promise<SessionUser> {
  const user = await getSession(req);
  if (!user) throw new ApiError("UNAUTHORIZED", "Sesi tidak valid, silakan login", {}, 401);
  if (mode === "write" && user.role !== "operator")
    throw new ApiError("FORBIDDEN", "Pemilik hanya bisa membaca data", {}, 403);
  if (mode === "admin" && user.role !== "pemilik")
    throw new ApiError("FORBIDDEN", "Hanya pemilik yang bisa mengelola operator", {}, 403);
  return user;
}