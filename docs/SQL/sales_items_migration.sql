-- ============================================================================
-- RPH — Normalisasi sales_items (jsonb → child table) + remap kode 12→17
-- Idempotent. Jalankan di Supabase SQL Editor.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- A. PRODUCT CATALOG (17 kode PRD — seed idempotent)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_catalog (
  code      TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  unit      TEXT NOT NULL DEFAULT 'kg',
  category  TEXT NOT NULL DEFAULT 'lainnya'
);

INSERT INTO public.product_catalog (code, name, unit, category) VALUES
  ('PC','Ayam Utuh Parting/Potong','kg','ayam_utuh'),
  ('KRKS','Karkas Utuh','kg','ayam_utuh'),
  ('BLD','Boneless Dada','kg','daging'),
  ('BLD-K','Boneless Dada Kulit','kg','daging'),
  ('BLP','Boneless Paha','kg','daging'),
  ('BLP-K','Boneless Paha Kulit','kg','daging'),
  ('PAHA-P','Paha (P)','kg','daging'),
  ('PAHA-U','Paha (U)','kg','daging'),
  ('PAHA-A','Paha (A)','kg','daging'),
  ('SAYAP-B','Sayap (B)','kg','daging'),
  ('SAYAP-R','Sayap (R)','kg','daging'),
  ('CKR','Cakar','kg','sampingan'),
  ('KPL','Kepala','ekor','sampingan'),
  ('KULIT','Kulit','kg','sampingan'),
  ('USUS','Usus','kg','sampingan'),
  ('ATI','Ati','kg','sampingan'),
  ('TULANG','Tulang','kg','sampingan')
ON CONFLICT (code) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────────────
-- B. SALES_ITEMS TABLE (child)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id     UUID NOT NULL REFERENCES public.sales (id) ON DELETE CASCADE,
  product_code TEXT NOT NULL REFERENCES public.product_catalog (code),
  product_name TEXT NOT NULL DEFAULT '',
  quantity     NUMERIC(10,2) NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(14,2) NOT NULL CHECK (unit_price > 0),
  subtotal     NUMERIC(16,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sales_id, product_code)
);

-- ────────────────────────────────────────────────────────────────────────────
-- C. TRIGGERS: auto subtotal + recalc total_amount
-- ────────────────────────────────────────────────────────────────────────────

-- Subtotal sebelum insert/update
CREATE OR REPLACE FUNCTION public.fnc_sales_items_subtotal()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.subtotal := ROUND(COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_price, 0), 2);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sales_items_subtotal ON public.sales_items;
CREATE TRIGGER trg_sales_items_subtotal
  BEFORE INSERT OR UPDATE ON public.sales_items
  FOR EACH ROW EXECUTE FUNCTION public.fnc_sales_items_subtotal();

-- Helper: recalc total_amount dari sum sales_items
CREATE OR REPLACE FUNCTION public.fnc_sales_recalc_total(p_sales_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.sales s
    SET total_amount = COALESCE((
      SELECT SUM(subtotal) FROM public.sales_items WHERE sales_id = p_sales_id
    ), 0)
  WHERE s.id = p_sales_id;
END $$;

-- Trigger wrapper: panggil recalc setelah insert/update/delete sales_items
CREATE OR REPLACE FUNCTION public.fnc_sales_recalc_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.fnc_sales_recalc_total(OLD.sales_id);
  ELSE
    PERFORM public.fnc_sales_recalc_total(NEW.sales_id);
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_sales_items_recalc ON public.sales_items;
CREATE TRIGGER trg_sales_items_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_items
  FOR EACH ROW EXECUTE FUNCTION public.fnc_sales_recalc_trigger();

-- ────────────────────────────────────────────────────────────────────────────
-- D. MIGRASI DATA: jsonb items → sales_items (dengan remap kode 12→17)
-- ────────────────────────────────────────────────────────────────────────────

-- Remap table (kode lama 12 → kode baru 17)
CREATE OR REPLACE FUNCTION public.remap_product_code(old_code TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN CASE old_code
    WHEN 'PC'  THEN 'PC'
    WHEN 'KRKS' THEN 'KRKS'
    WHEN 'BLD'  THEN 'BLD'
    WHEN 'DAD'  THEN 'BLD'      -- Dada → Boneless Dada
    WHEN 'PAH'  THEN 'PAHA-U'   -- Paha → Paha U
    WHEN 'SAY'  THEN 'SAYAP-B'  -- Sayap → Sayap B
    WHEN 'FIL'  THEN 'BLD-K'    -- Fillet → Boneless Dada Kulit
    WHEN 'GLG'  THEN 'TULANG'   -- Gelonggong → Tulang
    WHEN 'CKR'  THEN 'CKR'
    WHEN 'KPL'  THEN 'KPL'
    WHEN 'ATI'  THEN 'ATI'
    WHEN 'AMP'  THEN 'TULANG'   -- Ampela → Tulang
    ELSE old_code               -- kode tak dikenal → pertahankan
  END;
END $$;

-- Insert data dari jsonb ke sales_items (skip yang sudah punya)
INSERT INTO public.sales_items (sales_id, product_code, product_name, quantity, unit_price, subtotal)
SELECT
  s.id,
  public.remap_product_code(s.item->>'productCode'),
  COALESCE(s.item->>'productName', s.item->>'productCode'),
  (s.item->>'quantity')::NUMERIC,
  (s.item->>'unitPrice')::NUMERIC,
  COALESCE(
    (s.item->>'subtotal')::NUMERIC,
    ROUND((s.item->>'quantity')::NUMERIC * (s.item->>'unitPrice')::NUMERIC, 2)
  )
FROM (
  SELECT s.id, jsonb_array_elements(COALESCE(s.items, '[]'::jsonb)) AS item
  FROM public.sales s
  -- Filter: skip sales yang sudah punya sales_items (idempotent)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.sales_items si WHERE si.sales_id = s.id
  )
) s;

-- Hapus fungsi remap (tanpa rollback; bisa dijalankan ulang)
DROP FUNCTION IF EXISTS public.remap_product_code(TEXT);

-- ────────────────────────────────────────────────────────────────────────────
-- E. RLS — anon read/insert/delete sales_items (FE anon key)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.sales_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_read_sales_items ON public.sales_items;
DROP POLICY IF EXISTS anon_insert_sales_items ON public.sales_items;
DROP POLICY IF EXISTS anon_delete_sales_items ON public.sales_items;

CREATE POLICY anon_read_sales_items ON public.sales_items FOR SELECT USING (true);
CREATE POLICY anon_insert_sales_items ON public.sales_items FOR INSERT WITH CHECK (true);
CREATE POLICY anon_delete_sales_items ON public.sales_items FOR DELETE USING (true);

-- Pastikan product_catalog juga readable anon
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_read_product_catalog ON public.product_catalog;
CREATE POLICY anon_read_product_catalog ON public.product_catalog FOR SELECT USING (true);
DROP POLICY IF EXISTS anon_insert_product_catalog ON public.product_catalog;
CREATE POLICY anon_insert_product_catalog ON public.product_catalog FOR INSERT WITH CHECK (true);

-- ────────────────────────────────────────────────────────────────────────────
-- F. VERIFY (jalankan manual di Supabase → hasil harus 0)
-- SELECT sales_id, COUNT(*) FROM public.sales_items GROUP BY sales_id
--   HAVING COUNT(*) = 0; -- tidak ada sales tanpa items
-- SELECT s.id, s.total_amount, SUM(si.subtotal) AS calc_total
--   FROM public.sales s JOIN public.sales_items si ON si.sales_id = s.id
--   GROUP BY s.id, s.total_amount
--   HAVING ABS(s.total_amount - SUM(si.subtotal)) > 1;
-- ────────────────────────────────────────────────────────────────────────────
