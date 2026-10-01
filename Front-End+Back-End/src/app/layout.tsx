import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RPH · Sistem Pencatatan",
  description:
    "Digitalisasi pencatatan harian Rumah Potong Hewan (RPH) — penerimaan, penjualan, pengeluaran & rekap.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: next-themes menulis class dark/light ke <html>
    // sebelum hydration, jadi markup server != client. Ini batas yang diharapkan.
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}