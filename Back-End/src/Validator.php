<?php
// ── Validasi input (server-side). Menegakkan rule middleware dari spec. ─
namespace App;

class Validator
{
    /** Gagal jika date ada di masa depan. Semua entity. */
    public static function assertNotFuture(mixed $date): ?string
    {
        if (!is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return 'Tanggal wajib format YYYY-MM-DD';
        }
        if ($date > date('Y-m-d')) {
            return 'Tanggal tidak boleh di masa depan';
        }
        return null;
    }

    /** Kumpulkan error → lempar 400. `fields` = mapping field=>pesan. */
    public static function fail400(array $fields): never
    {
        throw new ApiException(
            'VALIDATION_ERROR',
            'Data tidak valid',
            $fields,
            400
        );
    }

    // ── Persekutuan: cek stok sales (berdasarkan papan tulis manual) ───
    /** @return array{error?: array}|null null=OK */
    public static function checkSaleStock(Supabase $db, string $orderDate, array $items): ?array
    {
        // Kumulatif butchery (cut) & sales sebelum/tanggal tsb — dari REST
        [$cuts] = $db->select('butchery', [], ['order' => 'date.asc']);
        [$sales] = $db->select('sales', [], ['order' => 'date.asc']);

        $prevCut = $dayCut = $prevSold = $daySold = [];
        foreach ($cuts ?? [] as $c) {
            $b = $c['date'] < $orderDate ? 'prevCut' : ($c['date'] === $orderDate ? 'dayCut' : null);
            if (!$b) continue;
            foreach ($c['parts'] as $p) ${$b}[$p['productCode']] = (${$b}[$p['productCode']] ?? 0) + $p['qtyKg'];
        }
        foreach ($sales ?? [] as $s) {
            $b = $s['date'] < $orderDate ? 'prevSold' : ($s['date'] === $orderDate ? 'daySold' : null);
            if (!$b) continue;
            foreach ($s['items'] as $it) ${$b}[$it['productCode']] = (${$b}[$it['productCode']] ?? 0) + $it['quantity'];
        }

        $stockErr = [];
        foreach ($items as $it) {
            $code = $it['productCode'];
            $opening = max(0, ($prevCut[$code] ?? 0) - ($prevSold[$code] ?? 0));
            $available = max(0, $opening + ($dayCut[$code] ?? 0) - ($daySold[$code] ?? 0));
            if ($it['quantity'] > $available) {
                $stockErr[$code] = "Stok tersedia {$available} kg, diminta {$it['quantity']} kg";
            }
        }
        return $stockErr ?: null;
    }
}