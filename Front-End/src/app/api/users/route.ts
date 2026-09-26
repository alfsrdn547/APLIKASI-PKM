import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route, readJson } from "@/lib/apiResponse";
import { requireAuth, hashPassword } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// KWhole user management. Semua |= pemilik — operator tak bisa kelola akun.

// GET /api/users — daftar akun (pemilik lihat semua).
export const GET = route(async (req) => {
  await requireAuth(req, "read");
  const { data } = await getAdminClient()
    .from("users")
    .select("id,email,full_name,role,active,created_at")
    .order("created_at", { ascending: false });
  return ok(data ?? []);
});

// POST /api/users — pemilik bikin akun operator baru.
export const POST = route(async (req) => {
  requireAuth(req, "admin");
  const b = await readJson<{ fullName?: string; email?: string; password?: string }>(req);
  const fullName = String(b?.fullName ?? "").trim();
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");

  const fields: Record<string, string> = {};
  if (!fullName) fields.fullName = "Nama wajib diisi";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "Email tidak valid";
  if (password.length < 8) fields.password = "Minimal 8 karakter";
  if (Object.keys(fields).length) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", fields, 400);

  const db = getAdminClient();
  const { data: dup } = await db.from("users").select("id").eq("email", email).maybeSingle();
  if (dup) throw new ApiError("EMAIL_EXISTS", "Email sudah terdaftar", { email: "Sudah dipakai" }, 409);

  const { data, error } = await db
    .from("users")
    .insert({ email, full_name: fullName, role: "operator", active: true, password_hash: hashPassword(password) })
    .select("id,email,full_name,role")
    .single();
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);

  await writeAudit("POST", "/api/users", "users", data.id, "create",
    null, { email, full_name: fullName, role: "operator", active: true }, 201, req);
  return ok(data, 201);
});

// PATCH /api/users — ubah status / password / role. ID dari body.
export const PATCH = route(async (req) => {
  const me = await requireAuth(req, "admin");
  const b = await readJson<{ id?: string; active?: boolean; password?: string; role?: string }>(req);
  if (!b?.id) throw new ApiError("VALIDATION_ERROR", "ID wajib diisi", {}, 400);
  if (b.id === me.id)
    throw new ApiError("VALIDATION_ERROR", "Tidak bisa mengubah akun sendiri", { id: "Pilih akun lain" }, 400);

  const db = getAdminClient();
  const { data: existing } = await db.from("users").select("id,full_name,active,role").eq("id", b.id).maybeSingle();
  if (!existing) throw new ApiError("NOT_FOUND", "User tidak ditemukan", {}, 404);
  // Akun pemilik terkunci dari UI: satu pemilik bisa menonaktifkan/menaikkan pemilik lain.
  // Butuh intervention langsung di Supabase. Cegah pemilik A mengambil alih pemilik B.
  if (existing.role === "pemilik")
    throw new ApiError("FORBIDDEN", "Akun pemilik tidak bisa diubah dari sini", {}, 403);

  // Promosi operator → pemilik. Sekali promoted, akun terkunci (lihat guard di atas).
  if (b.role !== undefined) {
    if (b.role !== "pemilik")
      throw new ApiError("VALIDATION_ERROR", "Role tidak valid", { role: "Hanya bisa menaikkan ke pemilik" }, 400);
    const { error } = await db.from("users").update({ role: "pemilik" }).eq("id", b.id);
    if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);
    await writeAudit("PATCH", `/api/users/${b.id}`, "users", b.id, "update",
      { role: existing.role }, { role: "pemilik" }, 200, req);
    return ok({ id: b.id, role: "pemilik" });
  }

  // Ganti password (tanpa harus nonaktifkan lalu aktifkan ulang).
  if (b.password !== undefined) {
    if (b.password.length < 8)
      throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { password: "Minimal 8 karakter" }, 400);
    const { error } = await db.from("users").update({ password_hash: hashPassword(b.password) }).eq("id", b.id);
    if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);
    await writeAudit("PATCH", `/api/users/${b.id}`, "users", b.id, "update",
      { password: "***" }, { password: "***" }, 200, req);
    return ok({ id: b.id, passwordUpdated: true });
  }

  if (typeof b.active !== "boolean")
    throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { active: "Wajib diisi" }, 400);

  const { error } = await db.from("users").update({ active: b.active }).eq("id", b.id);
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);

  await writeAudit("PATCH", `/api/users/${b.id}`, "users", b.id, "update",
    { active: existing.active }, { active: b.active }, 200, req);
  return ok({ id: b.id, active: b.active });
});
