"use client";

import type { ExpenseCategory } from "@/types";
import { EXPENSE_CATEGORIES, ORDER_STATUSES } from "@/constants/products";
import { cn, formatRp } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

// ─── Badge untuk status pesanan ──────────────────────────────────────
export function OrderStatusBadge({ status }: { status: string }) {
  const meta = ORDER_STATUSES.find((s) => s.value === status);
  return (
    <Badge className={cn("capitalize", meta?.color)}>
      {meta?.label ?? status}
    </Badge>
  );
}

// ─── Badge untuk kategori pengeluaran ────────────────────────────────
export function ExpenseCategoryBadge({ category }: { category: ExpenseCategory }) {
  const meta = EXPENSE_CATEGORIES.find((c) => c.value === category);
  return <Badge>{meta?.label ?? category}</Badge>;
}

// ─── Omset / nominal ─────────────────────────────────────────────────
export function Money({ value }: { value: number }) {
  return <span className="font-mono tabular-nums">{formatRp(value)}</span>;
}