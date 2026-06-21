import { api, setToken, clearToken, setStoredUser, getStoredUser } from "./api";

export type AuthUser = { id: string; email: string };

type AuthResult =
  | { user: AuthUser; token: string; error?: never }
  | { user?: never; token?: never; error: string };

export async function signUp(
  email: string,
  password: string
): Promise<{ error?: string }> {
  try {
    await api.post<void>("/auth/signup", { email, password });
    return {};
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const data = await api.post<{ token: string; user: AuthUser }>(
      "/auth/signin",
      { email, password }
    );
    setToken(data.token);
    setStoredUser(data.user);
    return data;
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export function signOut() {
  clearToken();
}

export function getUser(): AuthUser | null {
  return getStoredUser();
}

export function isAuthenticated(): boolean {
  return !!getStoredUser();
}
