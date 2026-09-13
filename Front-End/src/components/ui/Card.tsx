"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Card({ children, className, title, subtitle, action }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
