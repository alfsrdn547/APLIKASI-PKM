# RPH — RESTful API Spec v1

Base URL: `/api/v1` (contoh: `https://api.rph.example.com/api/v1`)
Format: JSON. Encoding: UTF-8. Semua request body & response pakai **camelCase** (konsisten dgn FE saat ini); internal mapping ke snake_case.

## Arsitektur

```
FE (Next.js / PHP) ──HTTP──► API Backend (PHP) ──► Supabase/PostgREST (service_role) ──► Postgres
                                 │
                                 ├─ middleware: auth, validasi, stock check, audit log
                                 └─ (opsional) Postgres function utk operasi atomik (create_sale)
```

- Backend PHP **memegang `service_role` key** (server-side only, JANGAN di-expose ke browser). FE penting pake anon key ≠ lagi; FE cuma pegang token sesi.
- RLS Supabase tetap on, tapi not the trusted layer — **integritas ditegakkan di API/service**.
- Semua nilai uang & stok dihitung **server-side** (tidak percaya client).

## Auth

| Metode | Header | Keterangan |
|---|---|---|
| Bearer JWT | `Authorization: Bearer <token>` | Token sesi dari Supabase Auth (login FE→backend nukar code utk token). |
| API key (ops, dulu) | `X-API-Key: <key>` | Buat integrasi internal / server-to-server; dimonitor di audit. |

Respon tak terautorisasi: `401`. Tanpa hak: `403`.

## Envelope

Sukses:
```json
{ "data": { ... } }
```
Error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Stok tidak cukup",
    "fields": { "items[0].quantity": "Stok tersedia 12.5 kg, diminta 30 kg" }
  }
}
```

Status: `200` OK · `201` Created · `204` No Content · `400` validasi · `401` unauth · `404` not found · `409` conflict (stok / duplikat) · `500` server.

---

## Resources

### `GET /products` — konstanta produk & harga (utk FE, jgn hardcode)
```json
{ "products": [{"code":"DAD","name":"Dada Fillet","unit":"kg","category":"potongan"}],
  "defaultPrices": {"DAD":45000}, "butcheryDistribution": {"DAD":0.18}, "avgWeightPerEkor": 1.8 }
```

### Penerimaan (`incoming`)

| Method & Path | Body / Params | Success | Catatan |
|---|---|---|---|
| `GET /incoming` | query `?from=&to=&limit=&offset=` | `200` array | urut `date asc` |
| `POST /incoming` | `{date, chickenIn, chickenDead, chickenBroken, notes}` | `201` record | validasi di bawah |
| `DELETE /incoming/{id}` | – | `204` | |

### Pemotongan (`butchery`)

| Method & Path | Body / Params | Success | Catatan |
|---|---|---|---|
| `GET /butchery` | `?from=&to=` | `200` array | |
| `POST /butchery` | `{date, incomingId?, chickenCount, parts:[{productCode,qtyKg}], notes}` | `201` record | `parts` non-kosong |
| `DELETE /butchery/{id}` | – | `204` | |

### Penjualan (`sales`)

| Method & Path | Body / Params | Success | Catatan |
|---|---|---|---|
| `GET /sales` | `?from=&to=&customer=&status=` | `200` array | |
| `POST /sales` | `{date, customerName, customerPhone?, items:[{productCode, productName, quantity, unitPrice}], notes, status?}` | `201` record | `totalAmount` **dihitung server**; stock check |
| `PATCH /sales/{id}/status` | `{status}` | `200` | status enum `pending/processing/completed/cancelled` |
| `DELETE /sales/{id}` | – | `204` | (opsional; buang stock dulu) |

### Pengeluaran (`expenses`)

| Method & Path | Body / Params | Success | Catatan |
|---|---|---|---|
| `GET /expenses` | `?from=&to=&category=` | `200` array | |
| `POST /expenses` | `{date, category, description, amount}` | `201` record | |
| `DELETE /expenses/{id}` | – | `204` | |

---

## Reports (computed, read-only)

| Method & Path | Params | Return |
|---|---|---|
| `GET /reports/whiteboard` | `?date=YYYY-MM-DD` | per-produk `{productCode, openingStock, incoming, outgoing, closingStock, unitPrice}` — **manual butchery = sumber** (`incoming`=Σ cut, `opening`=Σ prevCut−Σ prevSold) |
| `GET /reports/daily-summary` | `?from=&to=` OR `?month=YYYY-MM` | `{date, totalChickenIn, totalChickenDead, netProduction, totalSales, totalRevenue, totalExpenses, profit}` |
| `GET /reports/stock` | `?productCode=&date=` | `{opening, incoming, outgoing, closing}` (dipakai utk validasi sales) |

---

## Validasi input (middleware → service)

**Aturan global (semua entity `date`):**
| Field | Aturan | Error code |
|---|---|---|
| `date` | wajib, format `YYYY-MM-DD`, **TIDAK boleh masa depan** (tolak `date > today`) | `400` `FUTURE_DATE` |

**Penerimaan:**
| Field | Aturan |
|---|---|
| `chickenIn`, `chickenDead`, `chickenBroken` | integer ≥ 0; `chickenDead ≤ chickenIn`; `chickenBroken ≤ chickenIn` |

**Pemotongan:**
| Field | Aturan |
|---|---|
| `chickenCount` | integer ≥ 1 |
| `parts` | array ≥ 1 item; tiap `qtyKg` ≥ 0 (item dgn 0 dihapus/abaikan); `productCode` harus ada di `POSITIVE` + unit = kg |

**Penjualan:**
| Field | Aturan |
|---|---|
| `customerName` | wajib, non-empty |
| `items` | ≥ 1 item; tiap `quantity` > 0, `unitPrice` > 0 |
| `totalAmount` | IGNORED dari client — dihitung server: `Σ quantity × unitPrice` |
| **Stok** | `quantity ≤ available` (dari `GET /reports/stock` utk tanggal itu). Jika melebihi → **`409 STOCK_INSUFFICIENT`** |

**Pengeluaran:**
| Field | Aturan |
|---|---|
| `category` | enum `es_batu/biaya_angkut/pakan/operasional_alat/lainnya` |
| `description` | wajib, non-empty |
| `amount` | numeric > 0 |

---

## Middleware: Audit Log

Kalau API rutin (PHP/Node apapun):

```
Request masuk
  ├─ extract token → actor (user_id / api-key name)
  ├─ resolve entity & id dari route
  ├─ SYARAT (belum dieksekusi):
  │     • clone record lama (utk update/delete) → `before`
  ├─ validate + stock check (400/409 dulu, belum eksekusi)
  ├─ EKSEKUSI → dapat record baru → `after`
  └─ WRITE audit_log (INSERT) baris:
         { actor, method, path, entity, entity_id, action, changes:{before, after}, status_code, ip, created_at }
```

Idempotensi/race: operasi write berat (terutama **`POST /sales`**) dijalankan utk lewat **Postgres function `svc_create_sale()`** (satu transaksi: cek stok atomik → insert → audit). Ini mencegah 2 request menjual stok yang sama (cek stok di level penjualan bukan race-condition).

Tabel `audit_log` (tambahan di schema.sql):
```sql
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       text not null,
  method      text not null,
  path        text not null,
  entity      text not null,
  entity_id   uuid,
  action      text not null,           -- create | update | delete
  changes     jsonb not null default '{}',  -- {before, after}
  status_code smallint not null,
  ip          text,
  created_at  timestamptz not null default now()
);
```

Semua write (POST/PATCH/DELETE) WAJIB nulis audit. Baca (GET) opsional — kalau mau, cukup log lambda/rate.

---

## Contoh (single endpoint, OpenAPI style)

```yaml
paths:
  /api/v1/sales:
    post:
      summary: Buat order penjualan
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [date, customerName, items]
              properties:
                date: { type: string, format: date }
                customerName: { type: string }
                items:
                  type: array
                  minItems: 1
                  items:
                    type: object
                    required: [productCode, quantity, unitPrice]
                    properties:
                      productCode: { type: string }
                      quantity: { type: number, exclusiveMinimum: 0 }
                      unitPrice: { type: number, exclusiveMinimum: 0 }
      responses:
        '201': { description: Order dibuat, totalAmount dihitung server }
        '400': { description: Validasi gagal (50-ana date) }
        '409': { description: STOCK_INSUFFICIENT — qty melebihi stok }
        '401': { description: Unauthorized }
```

*(Full `openapi.yaml` bisa aku generate kalau mau.)*