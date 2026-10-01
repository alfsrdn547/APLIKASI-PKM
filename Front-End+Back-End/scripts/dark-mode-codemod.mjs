/**
 * Codemod dark mode — tambah pasangan `dark:` pada class warna di src/**/*.tsx.
 *
 * Prinsip:
 *  - Hanya warna NETRAL (white/gray) + palet status (blue/green/red/amber/...)
 *    yang disentuh; warna brand tetap.
 *  - Satu kali pass per token (bukan chained replace) supaya `bg-white` tidak
 *    ikut ter-transform dua kali.
 *  - Token yang sudah punya pasangan `dark:` di string yang sama dilewati.
 *  - Zona print (invoice/rekap) TIDAK dikecualikan: teks gelap dibatalkan
 *    lewat satu aturan `@media print` di globals.css, jadi pratinjau tetap
 *    gelap di layar tapi kertas tetap terbaca saat dicetak.
 *
 * Jalankan: node scripts/dark-mode-codemod.mjs [--dry]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(process.cwd(), "src");
const DRY = process.argv.includes("--dry");

// Sudah pakai dark: manual — jangan sentuh.
const SKIP_FILES = new Set([
  "components/ThemeProvider.tsx",
  "components/ui/ThemeToggle.tsx",
]);

// ─── Tabel pemetaan ────────────────────────────────────────────────────
// Surface (bg/border/divide/ring): lighten->darken, hanya shade <= 400.
const SURFACE = {
  white: "gray-900",
  "gray-50": "gray-900",
  "gray-100": "gray-800",
  "gray-200": "gray-700",
  "gray-300": "gray-600",
  "gray-400": "gray-500",
  "50": "{h}-950",
  "100": "{h}-900",
  "200": "{h}-800",
  "300": "{h}-700",
  "400": "{h}-600",
};

// Content (text/placeholder): darken->lighten, hanya shade >= 300.
const CONTENT = {
  black: "white",
  "50": "{h}-100",
  "100": "{h}-100",
  "200": "{h}-200",
  "300": "{h}-200",
  "400": "{h}-300",
  "500": "{h}-400",
  "600": "{h}-400",
  "700": "{h}-300",
  "800": "{h}-200",
  "900": "{h}-100",
};

const NEUTRAL = new Set(["white", "black"]);
const HUES = [
  "gray", "slate", "zinc", "neutral", "stone",
  "blue", "green", "red", "amber", "emerald", "yellow",
  "orange", "indigo", "purple", "pink", "rose",
];
const HUE_SET = new Set(HUES.filter((h) => h !== "gray"));

const SURFACE_UTILS = new Set(["bg", "border", "divide", "ring"]);
const CONTENT_UTILS = new Set(["text", "placeholder"]);

const VARIANTS = new Set([
  "hover", "active", "focus", "focus-visible", "focus-within", "disabled",
  "placeholder", "group-hover", "peer-focus", "dark", "print",
  "sm", "md", "lg", "xl", "2xl", "motion-safe", "first", "last", "odd", "even",
]);

const UTIL_RE =
  /^(bg|text|border|divide|ring|placeholder)(?:-[trblxyse])?-((?:[a-z]+-)?\d{2,3}|white|black)$/;

function mapColor(util, color) {
  const hue = color.replace(/-\d{2,3}$/, "");
  const shade = color.match(/\d{2,3}$/)?.[0];
  const isNeutral = NEUTRAL.has(color) || hue === "gray";

  if (SURFACE_UTILS.has(util)) {
    // Overlay gelap (bg-black) tetap hitam di kedua tema.
    if (color === "black") return null;
    if (isNeutral) return SURFACE[color] ?? null;
    if (!HUE_SET.has(hue) || !shade) return null;
    const to = SURFACE[shade];
    return to ? to.replace("{h}", hue) : null;
  }

  if (CONTENT_UTILS.has(util)) {
    if (color === "white") return null; // teks putih di atas warna brand tetap putih
    if (isNeutral) return CONTENT[color] ?? null;
    if (!HUE_SET.has(hue) || !shade) return null;
    const to = CONTENT[shade];
    return to ? to.replace("{h}", hue) : null;
  }
  return null;
}

function darkPairFor(token) {
  const parts = token.split(":");
  const utility = parts[parts.length - 1];
  const variants = parts.slice(0, -1);
  if (variants.some((v) => v === "dark")) return null; // sudah_variant dark

  const m = UTIL_RE.exec(utility);
  if (!m) return null;
  const utilKind = m[1];
  const normalized = utilKind === "placeholder" ? "text" : utilKind;
  const darkColor = mapColor(normalized, m[2]);
  if (!darkColor) return null;

  const darkUtil = utility.replace(m[2], darkColor);
  return ["dark", ...variants, darkUtil].join(":");
}

/** Token class = huruf kecil, angka, tanda -, :, [], %, /, koma. Tanpa kapital. */
const CLASSLIKE = /^[a-z0-9:_\-\[\]\.\/%]+$/;

function transformLiteral(content) {
  if (!content.trim() || !CLASSLIKE.test(content)) return null;
  const pieces = content.split(/(\s+)/);
  const tokens = pieces.filter((p, i) => i % 2 === 0);
  const existing = new Set(tokens);
  const out = [];

  for (let i = 0; i < pieces.length; i += 2) {
    const token = pieces[i];
    out.push(token);
    if (!token) continue;
    const pair = darkPairFor(token);
    // Jangan sisipkan ulang kalau pasangan gelapnya sudah ada di string ini.
    if (pair && !existing.has(pair)) {
      out.push(pair);
      existing.add(pair);
    }
  }
  const next = out.join("");
  return next === content ? null : next;
}

// Hanya string literal yang mungkin berisi class: '...' "..." `...`
const LITERAL_RE = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g;

function processFile(file) {
  const rel = relative(SRC, file).replace(/\\/g, "/");
  if (SKIP_FILES.has(rel)) return 0;

  const src = readFileSync(file, "utf8");
  let hits = 0;

  const next = src.replace(LITERAL_RE, (full, q, body) => {
    // String bertanda petik tunggal = string biasa; jangan disruptif.
    const transformed = transformLiteral(body);
    if (!transformed) return full;
    hits++;
    return q + transformed + q;
  });

  if (hits && !DRY) writeFileSync(file, next, "utf8");
  return hits;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name.endsWith(".tsx") ? [p] : [];
  });
}

const files = walk(SRC);
let total = 0;
for (const f of files) {
  const n = processFile(f);
  if (n) {
    total += n;
    console.log(`${n.toString().padStart(3)} literal  ${relative(process.cwd(), f)}`);
  }
}
console.log(`\n${DRY ? "[dry] " : ""}${total} string literal diubah di ${files.length} file.`);