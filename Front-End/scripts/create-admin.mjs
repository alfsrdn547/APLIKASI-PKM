// Buat akun pemilik pertama. Sekali jalan, lalu set env var-nya.
//   node scripts/create-admin.mjs admin@rph.sch.id "password-anda"
//
// Butuh SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY di .env.local.
// Idempotent: email yang sudah ada → exit 0 tanpa perubahan.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// .env.local dimuat manual — script jalan sebelum Next.js ada.
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  console.error(".env.local tidak ada di Front-End/ — salin dari .env.example lalu isi");
  process.exit(1);
}

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error("Pakai: node scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password minimal 8 karakter");
  process.exit(1);
}

// Sama dengan hashPassword() di src/lib/auth.ts — jangan diubah salah satu.
const hashPassword = (plain) => {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 32);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
};

// Nama var sama dengan yang dipakai src/lib/supabase-server.ts.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set di .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const { data: existing } = await db.from("users").select("id").eq("email", email).maybeSingle();
if (existing) {
  console.log(`Sudah ada: ${email} — tidak ada perubahan.`);
  process.exit(0);
}

const { data, error } = await db
  .from("users")
  .insert({
    email: email.toLowerCase(),
    full_name: "Admin RPH",
    role: "pemilik",
    active: true,
    password_hash: hashPassword(password),
  })
  .select("id,email,role")
  .single();

if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(`Pemilik dibuat: ${data.email} (${data.role})`);
