"use client";

import { useEffect, useState } from "react";

// ─── Siapa yang login (cache di module, 1 request per session) ───────
// Layout juga fetch /api/auth/me sendiri — ini dipakai komponen yang
// perlu tahu role buat nyembunyiin tombol tulis/hapus (pemilik read-only).
export type Me = {
  id: string;
  email: string;
  fullName: string;
  role: "operator" | "pemilik";
} | null;

let cached: { loaded: boolean; user: Me } = { loaded: false, user: null };
const listeners = new Set<(u: Me) => void>();

export function useUser(): Me {
  const [user, setUser] = useState<Me>(cached.user);

  useEffect(() => {
    if (!cached.loaded) {
      cached.loaded = true;
      fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          cached.user = j?.data ?? null;
          listeners.forEach((l) => l(cached.user));
        })
        .catch(() => {
          cached.loaded = false; // gagal → coba lagi di mount berikutnya
        });
    } else {
      setUser(cached.user);
    }
    const l = (u: Me) => setUser(u);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  return user;
}
