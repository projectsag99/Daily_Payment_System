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
import { apiFetch, ApiError } from "@/lib/api-client";
import {
  AuthUser,
  LoginResponse,
  canUseWebPanel,
  clearTokens,
  getAccessToken,
  getHomePath,
  getRefreshToken,
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
  // Always start loading so SSR and the first client render match (avoids hydration errors).
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const me = await Promise.race([
        apiFetch<AuthUser>("/auth/me", { token }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 10_000),
        ),
      ]);
      if (!canUseWebPanel(me)) {
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

      if (!canUseWebPanel(response.user)) {
        throw new Error("Tipo de cuenta no permitido en el panel web");
      }

      setTokens(response.accessToken, response.refreshToken);
      setUser(response.user);
      setIsLoading(false);
      router.replace(getHomePath(response.user));
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
