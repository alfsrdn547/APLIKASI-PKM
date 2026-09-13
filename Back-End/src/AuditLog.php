<?php
// ── Middleware-style audit log: tulis sebelum/after utk semua write. ──
namespace App;

class AuditLog
{
    public static function write(
        Supabase $db,
        string $actor,
        string $method,
        string $path,
        string $entity,
        ?string $entityId,
        string $action,
        array $before,
        array $after,
        int $statusCode,
        ?string $ip = null,
    ): void {
        $db->insert('audit_log', [
            'actor'       => $actor,
            'method'      => $method,
            'path'        => $path,
            'entity'      => $entity,
            'entity_id'   => $entityId,
            'action'      => $action,
            'changes'     => ['before' => $before, 'after' => $after],
            'status_code' => $statusCode,
            'ip'          => $ip,
        ]);
    }

    /** Ambil actor dari klaim JWT (sub/email) atau api-key. */
    public static function resolveActor(array $server): string
    {
        $key = $server['HTTP_X_API_KEY'] ?? null;
        if ($key) return 'apikey:' . substr($key, 0, 8);
        // Bearer => dari token (diparse di auth middleware); fallback generic
        return $server['HTTP_X_ACTOR'] ?? 'anonymous';
    }
}