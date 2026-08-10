import { getApiBaseUrl } from "@/lib/api-base-url";
import {
  LoginResponse,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
  getAccessTokenExpiresAt,
} from "@/lib/auth/session";

export const SESSION_EXPIRED_EVENT = "dps:session-expired";

const REFRESH_BUFFER_MS = 2 * 60 * 1000;

let refreshPromise: Promise<string | null> | null = null;

export function shouldRefreshAccessToken(): boolean {
  const expiresAt = getAccessTokenExpiresAt();
  if (!expiresAt) return false;
  return Date.now() >= expiresAt - REFRESH_BUFFER_MS;
}

export function notifySessionExpired(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      notifySessionExpired();
      return null;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });

      const body = (await response.json().catch(() => ({}))) as LoginResponse & {
        message?: string;
      };

      if (!response.ok) {
        clearTokens();
        notifySessionExpired();
        return null;
      }

      setTokens(body.accessToken, body.refreshToken, body.expiresIn);
      return body.accessToken;
    } catch {
      // Network errors should not log the user out immediately.
      return null;
    } finally {
      window.clearTimeout(timeoutId);
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function ensureValidAccessToken(): Promise<string | null> {
  const current = getAccessToken();
  if (!current) {
    return getRefreshToken() ? refreshAccessToken() : null;
  }
  if (!shouldRefreshAccessToken()) return current;
  return refreshAccessToken();
}
