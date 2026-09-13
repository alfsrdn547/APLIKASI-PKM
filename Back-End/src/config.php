<?php
// ── Config/env (bukan di-commit; baca dari environment) ──────────────
// cp .env.example .env lalu isi.
return [
    // Supabase project — service_role key (SERVER-ONLY, JANGAN di-expose ke FE)
    'supabase_url'      => getenv('SUPABASE_URL') ?: '',
    'supabase_key'      => getenv('SUPABASE_SERVICE_ROLE_KEY') ?: '',

    // Supabase JWT (utk verify token sesi FE) — dari dashboard
    'supabase_jwt_secret' => getenv('SUPABASE_JWT_SECRET') ?: '',
];