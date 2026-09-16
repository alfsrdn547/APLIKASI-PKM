import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route, readJson } from "@/lib/apiResponse";
import { assertNotFuture, checkSaleStock, isOneOf, PAY_STATUSES, PICKUP_STATUSES, ORDER_STATUSES } from "@/lib/validator";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/sales?from=&to=&status= → array sales + sales_items embed
export const GET = route(async (req) => {
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
  const b = await readJson<any>(req);
  const body = {
    date: b?.date,
    customerName: b?.customerName ?? "",
    customerPhone: b?.customerPhone ?? "",
    notes: b?.notes ?? "",
    payStatus: b?.payStatus ?? "belum_lunas",
    pickupStatus: b?.pickupStatus ?? "belum_diambil",
    paidAmount: Number(b?.paidAmount ?? 0),
    status: b?.status ?? "pending",
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

  // Items server-side (qty/price valid; subtotal trigger isi)
  const items = body.items
    .map((i: any) => ({
      productCode: String(i.productCode ?? ""),
      productName: String(i.productName ?? i.productCode ?? ""),
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
    }))
    .filter((i: any) => i.quantity > 0 && i.unitPrice > 0 && i.productCode);
  if (items.length === 0) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { items: "quantity & unitPrice harus > 0" }, 400);

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
    product_name: i.productName,
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

  await writeAudit("POST", "/api/sales", "sales", sale.id, "create", null, full, 201);
  return ok(full, 201);
});