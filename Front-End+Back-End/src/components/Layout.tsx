"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useRPHStore } from "@/stores/useRPHStore";
import { ImportModal } from "@/components/modules/ImportModal";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

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
  const [menuOpen, setMenuOpen] = useState(false); // drawer menu (HP)
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

  // Tutup drawer tiap pindah halaman (fallback kalau Link kelewat).
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
    // dark:bg-gray-900 (bukan 950) supaya ikut skala krem-coklat di
    // tailwind.config.ts. 950 nggak ada di override → jatuh ke abu cooler.
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 dark:bg-gray-900 dark:text-gray-300">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Hamburger — sidebar (drawer) cuma muncul lg+; HP pakai ini. */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-50 lg:hidden dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={menuOpen}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
            {/* Logo PT PANGAN MAKMUR NUSANTARA. PNG-nya background putih →
                di mode dark dikasih bg-white + padding biar gak "lubang". */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 ring-1 ring-gray-200 dark:ring-gray-700">
              <img src="/logo.png" alt="Logo PT PANGAN MAKMUR NUSANTARA" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold leading-tight">
                RPH Sistem Pencatatan
              </h1>
              <p className="hidden truncate text-xs text-gray-500 sm:block dark:text-gray-400">
                Rumah Potong Harian — Digitalisasi Data Harian
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === "operator" && (
              <button
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
              >
                <span>⬆️</span>
                <span className="hidden sm:inline">Import Data</span>
              </button>
            )}
            <span className="hidden rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 sm:inline dark:bg-green-900 dark:text-green-300">
              ● Sinkronisasi Real-time
            </span>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {user?.fullName?.charAt(0) ?? "A"}
              </div>
              <div className="hidden text-right leading-tight md:block">
                <span className="block text-sm text-gray-700 dark:text-gray-300">
                  {user?.fullName ?? "—"}
                </span>
                <span className="block text-xs capitalize text-gray-400 dark:text-gray-500">
                  {user?.role === "pemilik" ? "Pemilik (baca)" : "Operator"}
                </span>
              </div>
              <button
                onClick={logout}
                className="ml-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Keluar
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Backdrop drawer (HP) — klik area gelap = tutup menu */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
        )}
        {/* Sidebar: static di lg+; drawer slide-in di layar kecil */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-56 shrink-0 flex-col gap-1 border-r border-gray-200 bg-white p-3 pt-20 transition-transform lg:sticky lg:inset-y-auto lg:top-16 lg:z-0 lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:pt-3 dark:border-gray-800 dark:bg-gray-900",
            menuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
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
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
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
            <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
              Mode baca — akun pemilik. Perubahan data hanya boleh oleh operator.
            </p>
          )}
          {loading && (
            <p className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              Memuat data…
            </p>
          )}
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
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