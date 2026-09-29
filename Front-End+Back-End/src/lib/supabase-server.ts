import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only client (service_role) — HANYA dipakai di API route handlers.
// LAZY: client dibuat saat dipanggil pertama (bukan module load) supaya
// `next build` / page data collection gak gagal tanpa env.

let _admin: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL belum diset (server-only)"
    );
  }
  _admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}