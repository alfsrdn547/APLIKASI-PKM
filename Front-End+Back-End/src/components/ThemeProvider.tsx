"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * next-themes menyuntikkan <script> yang menulis class `dark`/`light` ke <html>
 * sebelum hydration. SSR merender tanpa class itu, jadi HTML server dan client
 * pasti berbeda -> hydration mismatch. suppressHydrationWarning pada <html>
 * di layout root yang menanganinya; ThemeProvider sendiri tetap 'use client'
 * supaya useTheme() di komponen toggle aman dipakai di sisi client.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}