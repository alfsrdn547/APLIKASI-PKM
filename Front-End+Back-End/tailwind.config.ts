import type { Config } from "tailwindcss";

/**
 * Palet RPH — Olive & Krem
 *
 * 4 warna dasar dari user:
 *   #8B9A6E  olive/sage  → warna aksi & accent
 *   #F7F2EB  krem        → background halaman
 *   #EAE2D6  krem tua    → surface/card, border
 *   #EEEEEE  abu muda    → hover, subtle
 *
 * Cara kerja: override token `blue` & `gray` bawaan Tailwind, bukan
 * find-replace 255 Kemunculan di 29 file. Semua `bg-blue-600` /
 * `text-gray-900` otomatis jadi olive/krem tanpa ngedit komponen.
 *
 * Kenapa override, bukan palet baru: cara ini 1 file vs 29 file, dan
 * diff-nya kelihatan jelas kalau nanti perlu revert.
 *
 * MODE GELAP — eye-friendly untuk dipakai malam. 3 hal yang bikin mata
 * sakit, semuanya dihindari:
 *   • background hitam pekat → #2F2C28 (coklat sangat gelap)
 *   • teks putih murni       → #DED5C7 (krem hangat)
 *   • cahaya biru            → seluruh skala condong ke coklat, nol biru
 * Token `gray` sengaja tetap SATU skala untuk dua mode: kode di 29 file
 * sudah memakai token berbeda untuk terang vs gelap (bg-gray-50 utk
 * background terang, bg-gray-900 utk background gelap), jadi overriding
 * satu skala otomatis melayani `dark:` tanpa sentuh file lain.
 *
 * Status (hijau/merah/amber) sengaja TIDAK disentuh — itu informasi
 * operasional, bukan hiasan. Lunas vs Belum Lunas harus kebaca 1 detik.
 */

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Aksen: #8B9A6E (olive) ──────────────────────────────────
        // Dipakai sebagai pengganti `blue` — tombol primary, link,
        // fokus input, menu aktif, badge info.
        //
        // Light  : 600 #75835C (cukup gelap buat teks putih)
        // Dark   : 500 #8B9A6E dipakai sebagai `dark:bg-blue-500` —
        //          aksen jadi LEBIH TERANG di mode gelap, persis
        //          seperti yang diawASCAN. Bukan lebih gelap.
        blue: {
          50: "#F4F6F1",
          100: "#E8EBE2",
          200: "#D3D8C6",
          300: "#B4BC9E",  // dark: teks aksen, kontras tinggi
          400: "#98A37C",  // dark: hover
          500: "#8B9A6E",  // dark: bg tombol primary
          600: "#75835C",  // light: bg tombol primary
          700: "#5F6B4A",
          800: "#4C553B",
          900: "#3D442F",
          DEFAULT: "#8B9A6E",
        },

        // ── Netral: #F7F2EB / #EAE2D6 / #EEEEEE ──────────────────────
        // Dipakai sebagai pengganti `gray` — teks, background, border.
        //
        // SKALA, bukan semantik — dan itulah yang bikin 1 set override
        // ini cukup untuk DUA mode tanpa sentuh 1 pun file komponen:
        //
        //   light  bg-gray-50   → #F7F2EB  (krem, terang)   ✅
        //   light  text-gray-900 → #2F2C28  (coklat gelap)   ✅
        //   dark   bg-gray-900  → #2F2C28  (coklat gelap)   ✅
        //   dark   text-gray-300 → #DED5C7  (krem, terang)   ✅
        //
        // Kode yang sudah ada di 29 file memakai token BERBEDA untuk
        // terang vs gelap, jadi skala yang sama melayani keduanya.
        //
        // Mode gelap jadi eye-friendly tanpa tambahan apa pun:
        //   • 900 #2F2C28 — coklat sangat gelap, bukan hitam pekat
        //     (hitam pekat bikin halo saat mata beradaptasi)
        //   • 300 #DED5C7 — krem hangat, bukan putih murni
        //   • seluruh skala condong ke coklat, nol biru
        gray: {
          50: "#F7F2EB",   // light bg halaman · dark teks paling redup
          100: "#F2EDE4",
          200: "#EAE2D6",  // light border card
          300: "#DED5C7",  // dark teks utama
          400: "#C9BFAF",  // light border input
          500: "#A8A092",  // dark teks sekunder
          600: "#857E72",  // light teks sekunder
          700: "#665F56",  // dark surface (header, hover)
          800: "#4A453E",  // dark border
          900: "#2F2C28",  // light teks utama · dark bg halaman
          950: "#211E1A",  // paling gelap — dipakai 34× di kode lama
          DEFAULT: "#EAE2D6",
        },

        // ── Krem tua + abu muda, tersedia eksplisit ───────────────────
        // Kalau butuh token yang tak bisa difit ke skala gray di atas.
        cream: {
          50: "#FDFBF7",
          100: "#F7F2EB",
          300: "#EAE2D6",
          500: "#D8CDBA",
          DEFAULT: "#EAE2D6",
        },
        sage: {
          100: "#E8EBE2",
          300: "#B4BC9E",
          500: "#8B9A6E",
          700: "#5F6B4A",
          DEFAULT: "#8B9A6E",
        },
        mist: {
          100: "#F5F5F5",
          300: "#E5E5E5",
          DEFAULT: "#EEEEEE",
        },
      },
    },
  },
  plugins: [],
};

export default config;