"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useRPHStore } from "@/stores/useRPHStore";
import { ImportModal } from "@/components/modules/ImportModal";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/penerimaan", label: "Penerimaan", icon: "🚚" },
  { href: "/pemotongan", label: "Pemotongan", icon: "🍗" },
  { href: "/papan-tulis", label: "Papan Tulis", icon: "📋" },
  { href: "/penjualan", label: "Penjualan", icon: "🧾" },
  { href: "/pengeluaran", label: "Pengeluaran", icon: "💸" },
  { href: "/operator", label: "Operator", icon: "👥" },
];

type AuthUser = { id: string; email: string; fullName: string; role: "operator" | "pemilik" };

export function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fetchAll = useRPHStore((s) => s.fetchAll);
  const loading = useRPHStore((s) => s.loading);
  const error = useRPHStore((s) => s.error);
  const fetchedOnce = useRef(false);
  const [importOpen, setImportOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Cek sesi via /api/auth/me — 401 → redirect ke /login.
  // Halaman login TIDAK memakai Layout (route group (auth)).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const me = await res.json().catch(() => ({}));
        if (res.ok && me?.data) {
          setUser(me.data);
        } else {
          window.location.href = "/login";
          return;
        }
      } catch {
        window.location.href = "/login";
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!fetchedOnce.current) {
      fetchedOnce.current = true;
      fetchAll();
    }
  }, [fetchAll]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // tetap redirect
    }
    window.location.href = "/login";
  };

  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M3 12h18M3 17h18" />
                <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="7" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="7" cy="17" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">
                RPH Sistem Pencatatan
              </h1>
              <p className="text-xs text-gray-500">
                Rumah Potong Hewan — Digitalisasi Data Harian
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === "operator" && (
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
              >
                <span>⬆️</span>
                Import Data
              </button>
            )}
            <span className="hidden rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 sm:inline">
              ● Sinkronisasi Real-time
            </span>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                {user?.fullName?.charAt(0) ?? "A"}
              </div>
              <div className="text-right leading-tight">
                <span className="block text-sm text-gray-700">
                  {user?.fullName ?? "—"}
                </span>
                <span className="block text-xs capitalize text-gray-400">
                  {user?.role === "pemilik" ? "Pemilik (baca)" : "Operator"}
                </span>
              </div>
              <button
                onClick={logout}
                className="ml-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-56 shrink-0 flex-col gap-1 border-r border-gray-200 bg-white p-3 lg:flex">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Menu
          </p>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            // Menu Operator khusus pemilik.
            if (item.href === "/operator" && user?.role !== "pemilik") return null;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-6 py-6">
          {user?.role === "pemilik" && (
            <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
              Mode baca — akun pemilik. Perubahan data hanya boleh oleh operator.
            </p>
          )}
          {loading && (
            <p className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
              Memuat data…
            </p>
          )}
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {children}
        </main>
      </div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}