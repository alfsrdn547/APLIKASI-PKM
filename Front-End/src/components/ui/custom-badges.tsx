"use client";

import type { ExpenseCategory, PayStatus, PickupStatus } from "@/types";
import { EXPENSE_CATEGORIES, ORDER_STATUSES, PAY_STATUSES, PICKUP_STATUSES } from "@/constants/products";
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

// ─── Badge status pembayaran (lunas/belum) ───────────────────────────
export function PayStatusBadge({ status }: { status: PayStatus }) {
  const meta = PAY_STATUSES.find((s) => s.value === status);
  return (
    <Badge className={cn("capitalize", meta?.color)}>
      {meta?.label ?? status}
    </Badge>
  );
}

// ─── Badge status pengambilan ────────────────────────────────────────
export function PickupStatusBadge({ status }: { status: PickupStatus }) {
  const meta = PICKUP_STATUSES.find((s) => s.value === status);
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