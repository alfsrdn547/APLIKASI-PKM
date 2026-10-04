// ─── Error contract + envelope ────────────────────────────────────────
export class ApiError extends Error {
  code: string;
  fields: Record<string, string>;
  status: number;

  constructor(code: string, message: string, fields: Record<string, string> = {}, status = 400) {
    super(message);
    this.code = code;
    this.fields = fields;
    this.status = status;
  }
}

export function ok(data: unknown, status = 200) {
  return Response.json({ data }, { status });
}

export function fail(e: unknown): Response {
  if (e instanceof ApiError) {
    return Response.json(
      { error: { code: e.code, message: e.message, fields: Object.keys(e.fields).length ? e.fields : null } },
      { status: e.status }
    );
  }
  const msg = e instanceof Error ? e.message : "Terjadi kesalahan server";
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: msg, fields: null } },
    { status: 500 }
  );
}

/** Parse JSON body, throw 400 kalau invalid. */
export async function readJson<T = any>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Body harus JSON", { body: "JSON tidak valid" }, 400);
  }
}

/** Baca field dari body dengan menerima camelCase ATAU snake_case.
 *  App kirim camelCase (`customerName`), tapi curl/DevTools/Postman
 *  mengirim snake_case (`customer_name`) — sama kayak nama kolom DB.
 *  Tanpa ini, field yang missed jadi `undefined` → `Number(undefined)` = NaN
 *  → validation error yang jauh dari penyebab sebenarnya. */
export function field(b: any, camel: string, snake?: string): any {
  return b?.[camel] ?? b?.[snake ?? camel];
}

/** Versi angka: NaN kalau absen atau bukan angka (bukan diam-diam 0). */
export function num(b: any, camel: string, snake?: string, fallback = 0): number {
  const raw = field(b, camel, snake);
  return raw === undefined || raw === null || raw === "" ? fallback : Number(raw);
}

/** Wrap handler — catch ApiError & unexpected. */
export function route(handler: (req: Request, ctx: any) => Promise<Response>) {
  return async (req: Request, ctx: any): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      return fail(e);
    }
  };
}