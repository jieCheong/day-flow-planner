const BASE = import.meta.env.VITE_BACKEND_URL as string;

function getToken(): string | null {
  return localStorage.getItem("dayflow_token");
}

export function setToken(token: string) {
  localStorage.setItem("dayflow_token", token);
}

export function clearToken() {
  localStorage.removeItem("dayflow_token");
  localStorage.removeItem("dayflow_user");
}

export function getStoredUser(): { id: string; email: string; username?: string | null } | null {
  const raw = localStorage.getItem("dayflow_user");
  return raw ? (JSON.parse(raw) as { id: string; email: string; username?: string | null }) : null;
}

export function setStoredUser(user: { id: string; email: string; username?: string | null }) {
  localStorage.setItem("dayflow_user", JSON.stringify(user));
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? `HTTP ${res.status}`
    );
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
