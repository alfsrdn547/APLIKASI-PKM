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

    /** SELECT. $opt: filters via eq: [col=>val], order, range */
    public function select(string $table, array $filter = [], array $opt = []): array
    {
        $q = $filter;
        foreach ($filter as $col => $val) {
            $q[$col] = 'eq.' . $val;
        }
        if (!empty($opt['order'])) $q['order'] = $opt['order'];
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

    /** RPC (Postgres function) — utk operasi atomik seperti create_sale */
    public function rpc(string $fn, array $payload): array
    {
        $r = $this->http->post($this->base . '/rpc/' . $fn, ['json' => $payload]);
        return [json_decode($r->getBody(), true), $r->getStatusCode()];
    }
}