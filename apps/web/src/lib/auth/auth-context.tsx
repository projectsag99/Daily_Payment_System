"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import {
  AuthUser,
  LoginResponse,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isAdmin,
  setTokens,
} from "@/lib/auth/session";
import { LoginFormValues } from "@/lib/schemas/auth.schema";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (values: LoginFormValues) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await apiFetch<AuthUser>("/auth/me", { token });
      if (!isAdmin(me)) {
        clearTokens();
        setUser(null);
      } else {
        setUser(me);
      }
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (values: LoginFormValues) => {
      const response = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });

      if (!isAdmin(response.user)) {
        throw new Error("Solo administradores pueden acceder al panel web");
      }

      setTokens(response.accessToken, response.refreshToken);
      setUser(response.user);
      router.replace("/collectors");
    },
    [router],
  );

  const logout = useCallback(async () => {
    const token = getAccessToken();
    const refreshToken = getRefreshToken();
    if (token) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          token,
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // ignore logout errors locally
      }
    }
    clearTokens();
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
