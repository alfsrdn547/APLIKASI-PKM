<?php
// ── Config/env (bukan di-commit; baca dari environment) ──────────────
// cp .env.example .env lalu isi.
return [
    // Supabase project — service_role key (SERVER-ONLY, JANGAN di-expose ke FE)
    'supabase_url'      => getenv('SUPABASE_URL') ?: '',
    'supabase_key'      => getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '',

    // Supabase JWT — dari dashboard. Verify token FE kalau FE pakai Supabase Auth.
    'supabase_jwt_secret' => getenv('SUPABASE_JWT_SECRET') ?: '',

    // Session HMAC FE — sama persis dgn JWT_SECRET di Front-End/.env.local.
    // FE sekarangpakai HS256 buatan sendiri, BUKAN Supabase Auth.
    'session_secret'    => getenv('JWT_SECRET') ?: '',
];