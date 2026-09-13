# RPH Backend — PHP (Slim 4) → Supabase

RESTful API utk RPH. Sesuai `docs/API_SPEC.md` & `docs/openapi.yaml`.
Backend memegang **service_role** key (server-side), FE cukup pegang token sesi.

## Requirements
- PHP ≥ 8.1 + Composer

## Install
```bash
cd Back-End
composer install
cp .env.example .env   # isi SUPABASE_URL, service_role, JWT secret
```

## Run (dev)
```bash
composer serve          # php -S localhost:8787 -t public
```
Route: `http://localhost:8787/products`, `POST /sales`, dll.

## Struktur
```
public/index.php      entry + middleware (auth, error, body parse)
src/routes.php        resource routes (incoming, butchery, sales, expenses, reports, audit)
src/Supabase.php      service_role REST client (Guzzle → Supabase)
src/Validator.php     validasi: date-future, stok sales, field rules
src/AuditLog.php      tulis audit_log (create/update/delete)
src/ApiException.php  error contract {code,message,fields}+status
src/config.php        baca env
```

## Aturan yang ditegakkan (dari spec)
- `date` gak boleh masa depan (semua POST/PATCH) — 400 `FUTURE_DATE`
- `POST /sales` totalAmount & subtotal **dihitung server**, abai dari client
- `POST /sales` stock check dari **papan tulis manual** (butchery = sumber) → 409 `STOCK_INSUFFICIENT`
- Semua write → `audit_log` (actor, before/after, status, ip)
- Error envelope: `{ error: { code, message, fields } }`

## Catatan scaffold
- Simplicity dulu: gak pakai ORM, langsung Supabase REST (uth rasa FE). Untuk prod & race-condition stok, bungkus `POST /sales` dalam Postgres function `svc_create_sale()` (satu transaksi atomik) — lihat spec.
- Auth middleware panggil `JWT::decode(token, supabase_jwt_secret, ['HS256'])` — sesuaikan algoritma dgn Supabase (HS256 default). Kalau pakai PKCE/anon-key di FE, verifikasi via Supabase Auth di API (upgrade path).
- `routes.php` untuk `from`+`to` sekaligus belum rapi (Supabase filter ganda) — TODO minor.