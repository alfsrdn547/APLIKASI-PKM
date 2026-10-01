"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Terang", icon: "☀️" },
  { value: "dark", label: "Gelap", icon: "🌙" },
  { value: "system", label: "Sistem", icon: "💻" },
] as const;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Tema asli baru diketahui setelah hydration; sebelum itu render placeholder
  // dengan ukuran sama supaya layout tidak melompat.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!mounted) {
    return (
      <div
        aria-hidden
        className={cn(
          "h-9 w-9 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800",
          className
        )}
      />
    );
  }

  const active = OPTIONS.find((o) => o.value === theme) ?? OPTIONS[2];

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Ubah tema tampilan"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-base transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        {/* resolvedTheme = tema yang benar-benar aktif setelah 'system' resolve */}
        <span aria-hidden>{resolvedTheme === "dark" ? "🌙" : active.icon}</span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={theme === o.value}
              onClick={() => {
                setTheme(o.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                theme === o.value
                  ? "bg-gray-100 font-medium text-gray-900 dark:bg-gray-700 dark:text-white"
                  : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              )}
            >
              <span aria-hidden>{o.icon}</span>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}