import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route, readJson, field, num } from "@/lib/apiResponse";
import { assertNotFuture, checkSaleStock, isOneOf, PAY_STATUSES, PICKUP_STATUSES, ORDER_STATUSES } from "@/lib/validator";
import { writeAudit } from "@/lib/audit";
import { requireAuth } from "@/lib/auth";
import { PRODUCTS } from "@/constants/products";

export const dynamic = "force-dynamic";

// GET /api/sales?from=&to=&status= → array sales + sales_items embed
export const GET = route(async (req) => {
  await requireAuth(req, "read");
  const q = new URL(req.url).searchParams;
  let query = getAdminClient().from("sales").select("*,sales_items(*)").order("date", { ascending: true });
  if (q.get("from")) query = query.gte("date", q.get("from")!);
  if (q.get("to")) query = query.lte("date", q.get("to")!);
  if (q.get("status")) query = query.eq("status", q.get("status")!);
  const { data, error } = await query;
  if (error) throw new ApiError("DB_ERROR", error.message, {}, 500);
  return ok(data ?? []);
});

// POST /api/sales — insert sales + sales_items (multi), total server/trigger
export const POST = route(async (req) => {
  await requireAuth(req, "write");
  const b = await readJson<any>(req);
  const body = {
    date: b?.date,
    customerName: field(b, "customerName", "customer_name") ?? "",
    customerPhone: field(b, "customerPhone", "customer_phone") ?? "",
    notes: field(b, "notes") ?? "",
    payStatus: field(b, "payStatus", "pay_status") ?? "belum_lunas",
    pickupStatus: field(b, "pickupStatus", "pickup_status") ?? "belum_diambil",
    paidAmount: num(b, "paidAmount", "paid_amount"),
    status: field(b, "status") ?? "pending",
    items: Array.isArray(b?.items) ? b.items : [],
  };

  assertNotFuture(body.date);
  if (String(body.customerName).trim() === "") {
    throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { customerName: "Wajib diisi" }, 400);
  }
  if (body.items.length === 0) {
    throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { items: "Minimal 1 item" }, 400);
  }
  if (!isOneOf(PAY_STATUSES, body.payStatus)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { payStatus: "Status bayar tidak valid" }, 400);
  if (!isOneOf(PICKUP_STATUSES, body.pickupStatus)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { pickupStatus: "Status ambil tidak valid" }, 400);
  if (!isOneOf(ORDER_STATUSES, body.status)) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { status: "Status tidak valid" }, 400);

  // Items server-side (qty/price valid; subtotal trigger isi).
  // productCode/productName/quantity/unitPrice menerima camelCase atau snake_case.
  const items = body.items
    .map((i: any) => ({
      productCode: String(field(i, "productCode", "product_code") ?? ""),
      quantity: num(i, "quantity"),
      unitPrice: num(i, "unitPrice", "unit_price"),
    }))
    .filter((i: any) => i.quantity > 0 && i.unitPrice > 0 && i.productCode);
  if (items.length === 0) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { items: "quantity & unitPrice harus > 0" }, 400);

  // productCode harus ada di katalog — kalau nggak, insert sales_items kena FK
  // dan muncul sebagai 500 DB_ERROR, bukan 400 yang bisa dibaca user.
  // productName juga diambil dari katalog, bukan dipercaya dari client.
  const catalog = Object.fromEntries(PRODUCTS.map((p) => [p.code, p.name]));
  for (const it of items) {
    if (!catalog[it.productCode])
      throw new ApiError("VALIDATION_ERROR", "Data tidak valid",
        { items: `Kode produk "${it.productCode}" tidak dikenal` }, 400);
  }

  // Stock check sebelum insert — manual butchery = sumber
  const stockErr = await checkSaleStock(getAdminClient(), body.date, items);
  if (stockErr) throw new ApiError("STOCK_INSUFFICIENT", "Stok tidak cukup", stockErr, 409);

  // 1. insert sales
  const { data: sale, error: saleErr } = await getAdminClient()
    .from("sales")
    .insert({
      date: body.date,
      customer_name: body.customerName.trim(),
      customer_phone: body.customerPhone,
      total_amount: 0, // trigger recalc dari sales_items
      status: body.status,
      pay_status: body.payStatus,
      pickup_status: body.pickupStatus,
      paid_amount: body.paidAmount,
      notes: body.notes,
    })
    .select()
    .single();
  if (saleErr) throw new ApiError("DB_ERROR", saleErr.message, {}, 500);

  // 2. insert sales_items (bulk)
  const itemRows = items.map((i: any) => ({
    sales_id: sale.id,
    product_code: i.productCode,
    product_name: catalog[i.productCode],
    quantity: i.quantity,
    unit_price: i.unitPrice,
  }));
  const { error: itemsErr } = await getAdminClient().from("sales_items").insert(itemRows);
  if (itemsErr) {
    // rollback
    await getAdminClient().from("sales").delete().eq("id", sale.id);
    throw new ApiError("DB_ERROR", itemsErr.message, {}, 500);
  }

  // 3. reload dgn embed (total_amount dr trigger)
  const { data: full } = await getAdminClient()
    .from("sales").select("*,sales_items(*)").eq("id", sale.id).single();

  // Impor Excel kirim payStatus "lunas" tapi paidAmount 0 (total belum
  // diketahui saat client kirim). Sekarang total sudah ada dari trigger —
  // samakan paid = total, biar "Tagihan per Customer" gak ngitung utang fiktif.
  let result = full;
  if (full && body.payStatus === "lunas" && !(body.paidAmount > 0) && Number(full.total_amount) > 0) {
    const { data: fixed } = await getAdminClient()
      .from("sales")
      .update({ paid_amount: full.total_amount })
      .eq("id", sale.id)
      .select("*,sales_items(*)")
      .maybeSingle();
    if (fixed) result = fixed;
  }

  await writeAudit("POST", "/api/sales", "sales", sale.id, "create", null, result, 201, req);
  return ok(result, 201);
});