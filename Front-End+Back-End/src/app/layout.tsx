import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RPH · Sistem Pencatatan",
  description:
    "Digitalisasi pencatatan harian Rumah Potong Harian (RPH) — penerimaan, penjualan, pengeluaran & rekap.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

// Address bar browser ikut palet. 2 mode = 2 warna; next-themes menulis
// class `dark` ke <html>, jadi media query-nya nyambung otomatis.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F2EB" },
    { media: "(prefers-color-scheme: dark)", color: "#2F2C28" },
  ],
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