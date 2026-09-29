// ─── FE → /api/* fetch helper (bukan anon langsung) ──────────────────
type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const err = json?.error;
    if ((res.status === 401 || err?.code === "UNAUTHORIZED") && typeof window !== "undefined") {
      window.location.href = "/login";
      throw new Error("Sesi berakhir, silakan login");
    }
    throw new Error(err?.message || `Request gagal (${res.status})`);
  }
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};