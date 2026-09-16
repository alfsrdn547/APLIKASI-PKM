import { getAdminClient } from "./supabase-server";

/** Tulis audit_log (server-side) utk tiap aksi write. */
export async function writeAudit(
  method: string,
  path: string,
  entity: string,
  entityId: string | null,
  action: "create" | "update" | "delete",
  before: unknown,
  after: unknown,
  status: number
): Promise<void> {
  try {
    await getAdminClient().from("audit_log").insert({
      actor: "api",
      method,
      path,
      entity,
      entity_id: entityId,
      action,
      changes: { before: before ?? null, after: after ?? null },
      status_code: status,
    });
  } catch {
    // jangan gagalkan request utama kalau audit gagal
  }
}