<?php
// ── Supabase service (REST client dengan service_role key) ────────────
namespace App;

use GuzzleHttp\Client;

class Supabase
{
    private Client $http;
    private string $base;

    public function __construct(array $config)
    {
        $this->base = rtrim($config['supabase_url'], '/') . '/rest/v1';
        $this->http = new Client([
            'headers' => [
                'apikey'          => $config['supabase_key'],
                'Authorization'   => 'Bearer ' . $config['supabase_key'], // service_role bypass RLS
                'Content-Type'    => 'application/json',
                'Prefer'          => 'return=representation',
            ],
            'http_errors' => false,
        ]);
    }

    /** SELECT. Filters: assoc array, string values = PostgREST operators
 *   'eq.', 'gte.', 'lte.', 'like.' — jika value sdh punya operator → pakai langsung.
 *   Jika value tanpa titik → otomatis 'eq.'.
 *   $opt: 'order' => 'col.asc', 'limit' => N, 'offset' => N
 */
    public function select(string $table, array $filter = [], array $opt = []): array
    {
        $q = [];
        foreach ($filter as $col => $val) {
            if (is_array($val)) {
                // Range: [min, max] — salah satu boleh null. PostgREST menerima
                // "gte.a,lte.b" dalam satu query param, jadi gte/lte nggak saling timpa.
                $parts = [];
                if (isset($val[0]) && $val[0] !== '') $parts[] = 'gte.' . $val[0];
                if (isset($val[1]) && $val[1] !== '') $parts[] = 'lte.' . $val[1];
                $q[$col] = implode(',', $parts);
            } else {
                // Jika value sdh mengandung operator (mis. 'gte.2026-09-01') → pakai langsung
                // Jika murni value → tambah eq.
                $q[$col] = is_string($val) && str_contains($val, '.') ? $val : 'eq.' . $val;
            }
        }
        if (!empty($opt['order'])) $q['order'] = $opt['order'];
        if (!empty($opt['limit'])) $q['limit'] = $opt['limit'];
        if (!empty($opt['offset'])) $q['offset'] = $opt['offset'];
        if (!empty($opt['select'])) $q['select'] = $opt['select'];
        $r = $this->http->get($this->base . '/' . $table, ['query' => $q]);
        return [json_decode($r->getBody(), true), $r->getStatusCode()];
    }

    public function insert(string $table, array $row): array
    {
        $r = $this->http->post($this->base . '/' . $table, ['json' => $row]);
        return [json_decode($r->getBody(), true), $r->getStatusCode()];
    }

    public function update(string $table, string $id, array $patch): array
    {
        $r = $this->http->patch($this->base . '/' . $table, [
            'query' => ['id' => 'eq.' . $id],
            'json'  => $patch,
        ]);
        return [json_decode($r->getBody(), true), $r->getStatusCode()];
    }

    public function delete(string $table, string $id): array
    {
        $r = $this->http->delete($this->base . '/' . $table, [
            'query' => ['id' => 'eq.' . $id],
        ]);
        return [null, $r->getStatusCode()];
    }
}