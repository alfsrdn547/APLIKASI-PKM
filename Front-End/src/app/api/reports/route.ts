import { getAdminClient } from "@/lib/supabase-server";
import { ApiError, ok, route } from "@/lib/apiResponse";
import { assertNotFuture } from "@/lib/validator";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const KG_PRODUCTS = ["PC","KRKS","BLD","BLD-K","BLP","BLP-K","PAHA-P","PAHA-U","PAHA-A","SAYAP-B","SAYAP-R","CKR","KULIT","USUS","ATI","TULANG"];
const PRICES: Record<string, number> = {
  PC:38000,KRKS:36000,BLD:45000,"BLD-K":46000,BLP:40000,"BLP-K":41000,
  "PAHA-P":40000,"PAHA-U":39000,"PAHA-A":38000,"SAYAP-B":25000,"SAYAP-R":24000,
  CKR:20000,KPL:10000,KULIT:15000,USUS:12000,ATI:25000,TULANG:8000,
};

async function loadCutters() {
  const [{ data: cuts }, { data: sales }] = await Promise.all([
    getAdminClient().from("butchery").select("*").order("date", { ascending: true }),
    getAdminClient().from("sales").select("*").order("date", { ascending: true }),
  ]);
  return { cuts: cuts ?? [], sales: sales ?? [] };
}

// GET /api/reports/whiteboard?date=YYYY-MM-DD  (manual butchery = sumber)
export const GET = route(async (req) => {
  await requireAuth(req, "read");
  const q = new URL(req.url).searchParams;
  const sub = q.get("sub");

  if (sub === "whiteboard" || !sub) {
    const date = q.get("date") as string;
    assertNotFuture(date);
    const { cuts, sales } = await loadCutters();

    const add = (m: Record<string, number>, k: string, v: number) => { m[k] = (m[k] || 0) + v; };
    const prevCut: Record<string, number> = {}, dayCut: Record<string, number> = {},
      prevSold: Record<string, number> = {}, daySold: Record<string, number> = {};
    for (const c of cuts) {
      const b = c.date < date ? prevCut : c.date === date ? dayCut : null;
      if (!b) continue;
      for (const p of c.parts ?? []) add(b, p.productCode, p.qtyKg);
    }
    for (const s of sales) {
      const b = s.date < date ? prevSold : s.date === date ? daySold : null;
      if (!b) continue;
      for (const it of s.items ?? []) add(b, it.productCode, it.quantity);
    }

    const r1 = (n: number) => Math.round(n * 10) / 10;
    const entries = KG_PRODUCTS.map((code) => {
      const opening = Math.max(0, r1((prevCut[code] || 0) - (prevSold[code] || 0)));
      const incoming = r1(dayCut[code] || 0);
      const outgoing = r1(daySold[code] || 0);
      return {
        productCode: code,
        openingStock: opening,
        incoming,
        outgoing,
        closingStock: Math.max(0, r1(opening + incoming - outgoing)),
        unitPrice: PRICES[code] || 0,
      };
    });
    return ok(entries);
  }

  if (sub === "stock") {
    const code = q.get("productCode")?.toUpperCase();
    const date = q.get("date") as string;
    if (!code) throw new ApiError("VALIDATION_ERROR", "Data tidak valid", { productCode: "Wajib" }, 400);
    assertNotFuture(date);
    const { cuts, sales } = await loadCutters();
    let prevCut = 0, dayCut = 0, prevSold = 0, daySold = 0;
    for (const c of cuts) {
      if (c.date > date) continue;
      for (const p of c.parts ?? []) {
        if (p.productCode !== code) continue;
        if (c.date === date) dayCut += p.qtyKg; else prevCut += p.qtyKg;
      }
    }
    for (const s of sales) {
      if (s.date > date) continue;
      for (const it of s.items ?? []) {
        if (it.productCode !== code) continue;
        if (s.date === date) daySold += it.quantity; else prevSold += it.quantity;
      }
    }
    const opening = Math.max(0, prevCut - prevSold);
    const closing = Math.max(0, opening + dayCut - daySold);
    return ok({ opening: Math.round(opening*10)/10, incoming: Math.round(dayCut*10)/10, outgoing: Math.round(daySold*10)/10, closing: Math.round(closing*10)/10 });
  }

  if (sub === "daily-summary") {
    const [{ data: inc }, { data: sales }, { data: exp }] = await Promise.all([
      getAdminClient().from("incoming").select("*").order("date", { ascending: true }),
      getAdminClient().from("sales").select("*").order("date", { ascending: true }),
      getAdminClient().from("expenses").select("*").order("date", { ascending: true }),
    ]);
    const dates = new Set<string>();
    for (const r of [...(inc ?? []), ...(sales ?? []), ...(exp ?? [])]) dates.add(r.date);
    const rows = [...dates].sort().map((d) => {
      let chIn = 0, chDead = 0, rev = 0, expT = 0, salesCnt = 0;
      for (const i of inc ?? []) if (i.date === d) { chIn += i.chicken_in; chDead += i.chicken_dead; }
      for (const s of sales ?? []) if (s.date === d) { salesCnt++; rev += s.total_amount; }
      for (const e of exp ?? []) if (e.date === d) expT += e.amount;
      return {
        date: d, totalChickenIn: chIn, totalChickenDead: chDead, netProduction: chIn - chDead,
        totalSales: salesCnt, totalRevenue: rev, totalExpenses: expT, profit: rev - expT,
      };
    });
    return ok(rows);
  }

  throw new ApiError("NOT_FOUND", "Sub-report tidak dikenal", {}, 404);
});