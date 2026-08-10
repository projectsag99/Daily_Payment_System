import { getApiBaseUrl } from "@/lib/api-base-url";

export interface ApiErrorBody {
  statusCode?: number;
  code?: string;
  message?: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof TypeError) return true;
  if (error instanceof Error && error.message === "Failed to fetch") return true;
  return false;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & {
    token?: string;
    skipAuthRetry?: boolean;
    _authRetried?: boolean;
  } = {},
): Promise<T> {
  const { token, skipAuthRetry, _authRetried, headers: initHeaders, ...init } = options;
  const headers = new Headers(initHeaders);
  headers.set("Content-Type", "application/json");

  let authToken = token;
  if (authToken && !skipAuthRetry && !_authRetried) {
    const { ensureValidAccessToken } = await import("@/lib/auth/token-refresh");
    authToken = (await ensureValidAccessToken()) ?? authToken;
  }

  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new NetworkError(
      "No se pudo conectar con la API. Verifica que esté activa (pnpm api:dev).",
    );
  }

  const body = (await response.json().catch(() => ({}))) as T & ApiErrorBody;

  if (
    !response.ok &&
    response.status === 401 &&
    authToken &&
    !skipAuthRetry &&
    !_authRetried &&
    !path.startsWith("/auth/login") &&
    !path.startsWith("/auth/refresh") &&
    !path.startsWith("/auth/register")
  ) {
    const { refreshAccessToken } = await import("@/lib/auth/token-refresh");
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, {
        ...options,
        token: newToken,
        _authRetried: true,
      });
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.code ?? "UNKNOWN",
      body.message ?? "Ocurrió un error inesperado",
    );
  }

  return body;
}

export { getApiBaseUrl } from "@/lib/api-base-url";
