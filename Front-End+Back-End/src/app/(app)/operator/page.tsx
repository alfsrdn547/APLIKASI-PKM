"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { formatShortDate } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: "operator" | "pemilik";
  active: boolean;
  created_at: string;
};

export default function OperatorsPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Form akun baru
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset password
  const [resetFor, setResetFor] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  // Promosi ke pemilik — one-way, perlu konfirmasi eksplisit
  const [promoteFor, setPromoteFor] = useState<UserRow | null>(null);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const json = await res.json().catch(() => ({}));
      if (res.ok) setUsers(json.data ?? []);
      else setError(json?.error?.message ?? "Gagal memuat akun");
    } catch {
      setError("Gagal memuat akun");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "Gagal membuat akun");
        return;
      }
      setMsg(`Akun ${email} dibuat. Sampaikan password ke ${fullName}.`);
      setFullName("");
      setEmail("");
      setPassword("");
      loadUsers();
    } catch {
      setError("Terjadi kesalahan, coba lagi");
    } finally {
      setSaving(false);
    }
  };

  const patch = async (body: Record<string, unknown>, successMsg: string) => {
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "Gagal menyimpan");
        return;
      }
      setMsg(successMsg);
      setResetFor(null);
      setPromoteFor(null);
      setNewPassword("");
      loadUsers();
    } catch {
      setError("Terjadi kesalahan, coba lagi");
    }
  };

  const cols = [
    {
      key: "nama",
      header: "Nama",
      render: (u: UserRow) => (
        <span className="font-medium text-gray-900">{u.full_name || "—"}</span>
      ),
    },
    { key: "email", header: "Email", render: (u: UserRow) => u.email },
    {
      key: "role",
      header: "Peran",
      render: (u: UserRow) => (
        <span className={`text-xs font-semibold uppercase ${u.role === "pemilik" ? "text-amber-600" : "text-blue-600"}`}>
          {u.role}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u: UserRow) => (
        <span className={`text-xs font-medium ${u.active ? "text-green-600" : "text-red-500"}`}>
          {u.active ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    { key: "created", header: "Dibuat", render: (u: UserRow) => formatShortDate(u.created_at) },
    {
      key: "aksi",
      header: "",
      render: (u: UserRow) =>
        u.role === "operator" ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setResetFor(u);
                setPromoteFor(null);
                setNewPassword("");
                setMsg(null);
              }}
            >
              Reset password
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPromoteFor(u);
                setResetFor(null);
                setMsg(null);
              }}
            >
              Jadikan pemilik
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                patch(
                  { id: u.id, active: !u.active },
                  `${u.email} ${u.active ? "dinonaktifkan" : "diaktifkan"}`
                )
              }
            >
              {u.active ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Kelola Akun</h2>
        <p className="text-sm text-gray-500">
          Buat akun operator, atur status, atau reset password
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}
      {msg && (
        <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{msg}</p>
      )}

      <Card title="Buat Akun Operator" subtitle="Sampaikan password secara pribadi ke yang bersangkutan">
        <form onSubmit={createUser} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nama lengkap"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Budi Santoso"
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="budi@rph.sch.id"
              required
            />
          </div>
          <Input
            label="Password sementara"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
            hint="Sampaikan lewat WhatsApp. Bisa diganti setelahnya."
            required
          />
          <Button type="submit" loading={saving}>
            Buat akun
          </Button>
        </form>
      </Card>

      {resetFor && (
        <Card title={`Reset password — ${resetFor.email}`} subtitle="Minimal 8 karakter">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              patch({ id: resetFor.id, password: newPassword }, `Password ${resetFor.email} diganti`);
            }}
            className="space-y-4"
          >
            <Input
              label="Password baru"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              required
            />
            <div className="flex gap-2">
              <Button type="submit">Simpan password</Button>
              <Button type="button" variant="outline" onClick={() => setResetFor(null)}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {promoteFor && (
        <Card
          title={`Jadikan ${promoteFor.email} pemilik?`}
          subtitle="Akun pemilik tidak bisa diubah dari halaman ini lagi"
        >
          <div className="space-y-4">
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <strong>{promoteFor.full_name || promoteFor.email}</strong> akan jadi
              pemilik: bisa melihat semua data dan mengelola akun operator.
              Perubahan ini <strong>tidak bisa dibatalkan</strong> dari halaman ini —
              hanya lewat Supabase SQL Editor.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  patch(
                    { id: promoteFor.id, role: "pemilik" },
                    `${promoteFor.email} sekarang pemilik`
                  )
                }
              >
                Ya, jadikan pemilik
              </Button>
              <Button variant="outline" onClick={() => setPromoteFor(null)}>
                Batal
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card title="Daftar Akun" subtitle={`${users.length} akun`}>
        <Table
          columns={cols}
          data={users}
          emptyMessage={loading ? "Memuat…" : "Belum ada akun"}
        />
      </Card>
    </div>
  );
}
