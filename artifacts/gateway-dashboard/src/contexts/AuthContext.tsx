import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiGet, apiPost } from "@/lib/api-client";
import type { Permission, Role } from "@/lib/rbac";

export type AuthStatus = {
  enabled: boolean;
  user_id: string;
  username: string;
  display_name: string;
  role: Role | "auth-disabled";
  permissions: Permission[];
  expiresAt?: string;
};

type AuthContextValue = {
  auth: AuthStatus | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const result = await apiGet<{ ok: boolean; session: AuthStatus }>("session");
    if (result.ok) {
      setAuth(result.data.session);
      setError(null);
    } else {
      setAuth(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(username: string, password: string) {
    const result = await apiPost<{ ok: boolean; session: AuthStatus }>("auth/login", { username, password });
    if (result.ok) {
      setAuth(result.data.session);
      setError(null);
      return { ok: true };
    }
    setError(result.error);
    return { ok: false, error: result.error };
  }

  async function logout() {
    await apiPost("auth/logout", {});
    setAuth(null);
  }

  function hasPermission(permission: Permission): boolean {
    if (!auth) return false;
    if (auth.role === "auth-disabled") return true;
    return auth.permissions.includes(permission);
  }

  return (
    <AuthContext.Provider value={{ auth, loading, error, login, logout, refresh, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
