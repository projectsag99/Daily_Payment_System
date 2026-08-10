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
import { apiFetch, ApiError, isNetworkError } from "@/lib/api-client";
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
import {
  SESSION_EXPIRED_EVENT,
  ensureValidAccessToken,
  refreshAccessToken,
  shouldRefreshAccessToken,
} from "@/lib/auth/token-refresh";
import { LoginFormValues } from "@/lib/schemas/auth.schema";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (values: LoginFormValues) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_REFRESH_CHECK_MS = 60_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  // Always start loading so SSR and the first client render match (avoids hydration errors).
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async (token: string): Promise<AuthUser | null> => {
    const me = await Promise.race([
      apiFetch<AuthUser>("/auth/me", { token }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 10_000),
      ),
    ]);

    if (!canUseWebPanel(me)) {
      clearTokens();
      return null;
    }

    return me;
  }, []);

  const loadUser = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken && !getAccessToken()) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const loadingTimeoutId = window.setTimeout(() => {
      setIsLoading(false);
    }, 15_000);

    try {
      let token = await ensureValidAccessToken();
      if (!token && getRefreshToken()) {
        token = await refreshAccessToken();
      }
      if (!token) {
        setUser(null);
        return;
      }

      const me = await fetchCurrentUser(token);
      setUser(me);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          try {
            const me = await fetchCurrentUser(newToken);
            setUser(me);
            return;
          } catch {
            // fall through to clear session
          }
        }
      }

      if (!isNetworkError(error)) {
        clearTokens();
        setUser(null);
      }
    } finally {
      window.clearTimeout(loadingTimeoutId);
      setIsLoading(false);
    }
  }, [fetchCurrentUser]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    const onSessionExpired = () => {
      setUser(null);
      router.replace("/login");
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const intervalId = window.setInterval(() => {
      if (!shouldRefreshAccessToken()) return;
      void refreshAccessToken().then((token) => {
        if (!token) {
          setUser(null);
        }
      });
    }, SESSION_REFRESH_CHECK_MS);

    return () => window.clearInterval(intervalId);
  }, [user]);

  const login = useCallback(
    async (values: LoginFormValues) => {
      const response = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
        skipAuthRetry: true,
      });

      if (!canUseWebPanel(response.user)) {
        throw new Error("Tipo de cuenta no permitido en el panel web");
      }

      setTokens(response.accessToken, response.refreshToken, response.expiresIn);
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
          skipAuthRetry: true,
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
