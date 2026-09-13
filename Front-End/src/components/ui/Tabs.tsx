"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

// ─── Tabs API ────────────────────────────────────────────────────────
interface TabsContextValue {
  active: string;
  onSelect: (key: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({
  tabs,
  active,
  onSelect,
  className,
}: {
  tabs: string[];
  active: string;
  onSelect: (key: string) => void;
  className?: string;
}) {
  return (
    <TabsContext.Provider value={{ active, onSelect }}>
      <div className={cn("flex gap-2", className)}>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onSelect(tab)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active === tab
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {tab}
          </button>
        ))}
      </div>
    </TabsContext.Provider>
  );
}

export function TabPanel({
  children,
  active,
}: {
  children: ReactNode;
  active: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) return null;
  return ctx.active === active ? <>{children}</> : null;
}

export function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("useTabs must be used within Tabs");
  return ctx;
}