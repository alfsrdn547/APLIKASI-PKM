#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate a PDF explaining the RPH Digitalisasi project, in Indonesian."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle)
from reportlab.lib import colors

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "Penjelasan_Proyek_RPH_Digitalisasi.pdf")

DARK = HexColor("#1e3a5f")
ACCENT = HexColor("#c0392b")
LIGHT = HexColor("#eef3f9")
GREY = HexColor("#4a5568")

styles = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=20,
                            leading=26, textColor=DARK, spaceAfter=4*mm),
    "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=11,
                               leading=15, textColor=GREY, spaceAfter=10*mm),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=14,
                         leading=18, textColor=DARK,
                         spaceBefore=8*mm, spaceAfter=3*mm),
    "h3": ParagraphStyle("h3", fontName="Helvetica-Bold", fontSize=11.5,
                         leading=15, textColor=ACCENT,
                         spaceBefore=4*mm, spaceAfter=2*mm),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10.5,
                           leading=15, textColor=colors.black, spaceAfter=3*mm),
    "bullet": ParagraphStyle("bullet", fontName="Helvetica", fontSize=10.5,
                             leading=14.5, textColor=colors.black,
                             leftIndent=6*mm, spaceAfter=1.5*mm),
    "note": ParagraphStyle("note", fontName="Helvetica-Oblique", fontSize=10,
                           leading=14, textColor=GREY, spaceAfter=3*mm),
}

def build_doc():
    t = BaseDocTemplate(OUT, pagesize=A4,
                        leftMargin=22*mm, rightMargin=22*mm,
                        topMargin=20*mm, bottomMargin=18*mm,
                        title="Penjelasan Proyek RPH Digitalisasi",
                        author="Tim RPH Digitalisasi")
    frame = Frame(t.leftMargin, t.bottomMargin, t.width, t.height, id="main")
    def on_page(canvas, document):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(GREY)
        canvas.drawString(22*mm, 10*mm, "RPH Digitalisasi — Sistem Pencatatan Rumah Potong Hewan")
        canvas.drawRightString(A4[0]-22*mm, 10*mm, "Hal. %d" % document.page)
        canvas.restoreState()
    t.addPageTemplates([PageTemplate(id="page", frames=[frame], onPage=on_page)])
    return t

def style_table(rows, col_widths):
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), DARK),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTNAME", (0,1), (-1,-1), "Helvetica"),
        ("FONTSIZE", (0,0), (-1,-1), 9.5),
        ("LEADING", (0,0), (-1,-1), 12.5),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, LIGHT]),
        ("GRID", (0,0), (-1,-1), 0.5, HexColor("#cbd5e1")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING", (0,0), (-1,-1), 6),
    ]))
    return t

story = []
story.append(Paragraph("RPH Digitalisasi — Sistem Pencatatan Rumah Potong Hewan", styles["title"]))
story.append(Paragraph("Penjelasan proyek · 13 September 2026", styles["subtitle"]))

# 1. Ringkasan
story.append(Paragraph("1. Ringkasan Proyek", styles["h2"]))
story.append(Paragraph(
    "Sistem pencatatan digital untuk Rumah Potong Hewan (RPH) yang menggantikan pencatatan "
    "manual menjadi aplikasi web: mencatat penerimaan ayam, pemotongan, penjualan, dan "
    "pengeluaran, lengkap dengan dashboard laporan harian.", styles["body"]))

# 2. Masalah
story.append(Paragraph("2. Masalah yang Dipecahkan", styles["h2"]))
for b in [
    "Pencatatan operasional RPH masih manual menggunakan buku catatan.",
    "Rawan salah tulis dan data mudah hilang.",
    "Stok harian tidak diketahui dengan pasti karena tidak ada rekapitulasi otomatis.",
    "Laporan harian (pendapatan, pengeluaran, laba) harus dihitung manual dan memakan waktu.",
]:
    story.append(Paragraph("• " + b, styles["bullet"]))

# 3. Solusi & fitur
story.append(Paragraph("3. Solusi dan Fitur Utama", styles["h2"]))
story.append(Paragraph(
    "Aplikasi web pengguna tunggal (single-user) yang dipakai langsung di lokasi RPH. "
    "Terdiri dari lima modul operasional dan satu dashboard rekapitulasi:", styles["body"]))
mods = [
    ("Penerimaan", "Mencatat ayam masuk: jumlah hidup, mati, dan cacat; menghitung jumlah bersih otomatis."),
    ("Pemotongan", "Mencatat pemotongan manual: jumlah ekor dipotong dan rincian berat per bagian (dada, paha, sayap, dan lainnya)."),
    ("Papan Tulis", "Menampilkan stok hari ini otomatis, dihitung dari pemotongan dikurangi penjualan per produk."),
    ("Penjualan", "Form kasir dengan keranjang belanja, pemeriksaan stok otomatis, dan cetak nota dua rangkap (A4)."),
    ("Pengeluaran", "Mencatat biaya harian berdasarkan kategori."),
]
story.append(style_table([["Modul", "Fungsi"]] + mods, [38*mm, 108*mm]))
story.append(Paragraph(
    "Dashboard menampilkan pendapatan, pengeluaran, dan laba hari ini, tabel rekap harian, "
    "serta ekspor data ke CSV/JSON dan cetak.", styles["body"]))

# 4. Validasi otomatis
story.append(Paragraph("4. Validasi Otomatis", styles["h2"]))
for b in [
    "Menolak tanggal di masa depan serta jumlah bernilai negatif atau nol.",
    "Memeriksa ketersediaan stok sebelum transaksi penjualan — stok kurang akan ditolak (HTTP 409).",
    "Validasi diterapkan dua lapis: di sisi aplikasi (front-end) dan di sisi server (back-end).",
]:
    story.append(Paragraph("• " + b, styles["bullet"]))

# 5. Teknologi
story.append(Paragraph("5. Teknologi yang Digunakan", styles["h2"]))
tech = [
    ("Front-end", "Next.js 14 + TypeScript + Tailwind CSS, state management Zustand."),
    ("Database", "Supabase (PostgreSQL) — tabel data operasional + audit log, dengan Row Level Security."),
    ("Back-end", "REST API PHP Slim 4 dengan autentikasi JWT; kunci service_role hanya disimpan di sisi server, bukan di browser."),
]
story.append(style_table([["Lapisan", "Teknologi"]] + tech, [38*mm, 108*mm]))

# 6. Back-end API
story.append(Paragraph("6. Back-end API (PHP Slim 4)", styles["h2"]))
story.append(Paragraph(
    "Seluruh data kini dilayani REST API. Semua permintaan memerlukan token JWT (HS256) "
    "di header Authorization. Error dikembalikan dalam format terstruktur "
    "<i>{error: {code, message, fields}}</i>. Setiap aksi tulis (tambah/ubah/hapus) dicatat "
    "ke tabel audit log: siapa pelaku (dari token), aksi, data sebelum & sesudah, status, dan IP.", styles["body"]))
endpoints = [
    ("Metode & Rute", "Fungsi"),
    ("GET /products", "Daftar produk, harga default, dan distribusi berat pemotongan"),
    ("GET/POST/… /incoming", "Kelola data penerimaan ayam masuk"),
    ("GET/POST/… /butchery", "Kelola data pemotongan (berat per bagian)"),
    ("GET/POST /sales, PATCH/DELETE", "Kelola penjualan; PATCH ubah status, cek stok otomatis"),
    ("GET/POST /expenses", "Kelola pengeluaran harian"),
    ("GET /reports/whiteboard", "Laporan papan tulis stok (stok dihitung server-side)"),
    ("GET /reports/daily-summary", "Rekap harian: ayam masuk, pendapatan, pengeluaran, laba"),
    ("GET /audit-log", "Riwayat jejak audit seluruh perubahan data"),
]
story.append(style_table(endpoints, [68*mm, 78*mm]))
story.append(Paragraph(
    "Pemeriksaan stok (apakah cukup sebelum menjual) dihitung di server dari data pemotongan "
    "dikurangi penjualan, bukan dipercaya dari angka yang dikirim klien. Jumlah total penjualan "
    "juga dihitung ulang di server sehingga klien tidak bisa mengubah nominal seenaknya.", styles["body"]))

# 7. Status & roadmap
story.append(Paragraph("7. Status Proyek dan Rencana Selanjutnya", styles["h2"]))
status = [
    ["Komponen", "Status"],
    ["Front-end + database", "Selesai dan berjalan (dapat didemonstrasikan langsung)"],
    ["Back-end API", "Selesai dibangun — endpoint/validasi/audit — menunggu dihubungkan ke front-end"],
    ["Keamanan", "JWT + kunci service_role server-side + audit log aktif"],
]
story.append(style_table(status, [60*mm, 86*mm]))
story.append(Paragraph("Langkah berikutnya:", styles["h3"]))
for b in [
    "Menghubungkan back-end API ke front-end, menggantikan koneksi langsung dengan kunci publik.",
    "Deploy aplikasi ke Vercel agar siap dipakai operasional.",
    "Migrasi skema database mengikuti PRD: tabel dinormalisasi, katalog produk lengkap, dan kontrol akses berbasis peran.",
]:
    story.append(Paragraph("• " + b, styles["bullet"]))

story.append(Spacer(1, 6*mm))
story.append(Paragraph("Dokumen ini menyertai PRD Digitalisasi Sistem RPH untuk keperluan presentasi/pengujian proyek.", styles["note"]))

build_doc().build(story)
print("OK:", OUT)