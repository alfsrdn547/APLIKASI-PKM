import { getAdminClient } from "./supabase-server";
import { getSession } from "./auth";

/** Tulis audit_log (server-side) utk tiap aksi write.
 *  actor diisi dari session user bila ada (email#role), else "api". */
export async function writeAudit(
  method: string,
  path: string,
  entity: string,
  entityId: string | null,
  action: "create" | "update" | "delete",
  before: unknown,
  after: unknown,
  status: number,
  req?: Request
): Promise<void> {
  let actor = "api";
  try {
    if (req) {
      const u = await getSession(req);
      if (u) actor = `${u.email}#${u.role}`;
    }
    // Supabase-js nggak throw — error dikembalikan di `.error`, bukan dilempar.
    // Cek manual, kalau nggak audit gagal diam-dim selamanya.
    const { error } = await getAdminClient().from("audit_log").insert({
      actor,
      method,
      path,
      entity,
      entity_id: entityId,
      action,
      changes: { before: before ?? null, after: after ?? null },
      status_code: status,
    });
    if (error) console.error(`[audit] gagal tulis ${method} ${path}:`, error.message);
  } catch (e) {
    // jangan gagalkan request utama kalau audit gagal
    console.error(`[audit] error tak terduga ${method} ${path}:`, e);
  }
}