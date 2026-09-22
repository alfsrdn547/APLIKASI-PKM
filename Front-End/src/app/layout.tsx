import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
    <html lang="id">
      <body className={inter.className}>{children}</body>
    </html>
  );
}