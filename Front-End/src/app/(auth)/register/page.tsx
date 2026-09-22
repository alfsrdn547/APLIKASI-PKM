"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const inviteDefault = params.get("invite") ?? "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteToken, setInviteToken] = useState(inviteDefault);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, password, role: "operator", inviteToken }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "Pendaftaran gagal");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan, coba lagi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Daftar akun operator</h2>
          <p className="mt-1 text-sm text-gray-500">
            Undangan — butuh token dari pemilik
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Nama lengkap"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@rph.com"
            autoComplete="username"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            hint="Minimal 6 karakter"
            required
          />
          <Input
            label="Token undangan"
            value={inviteToken}
            onChange={(e) => setInviteToken(e.target.value)}
            placeholder="Token dari pemilik"
            required
          />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          <Button type="submit" loading={loading} className="w-full">
            Daftar & masuk
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}