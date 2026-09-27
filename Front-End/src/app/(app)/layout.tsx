"use client";

import { Layout } from "@/components/Layout";

// Shell aplikasi (sidebar/topbar/auth guard) — hanya untuk halaman dashboard.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Layout>{children}</Layout>;
}