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

function useDevProxy(): boolean {
  return process.env.NEXT_PUBLIC_API_PROXY !== "false";
}

export function getApiBaseUrl(): string {
  const serverFallback = "http://127.0.0.1:3001/v1";

  if (typeof window !== "undefined" && useDevProxy()) {
    return `${window.location.origin}/v1`;
  }

  const fallback = "http://localhost:3001";
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? fallback).trim();

  if (!raw || raw === "/") {
    return typeof window === "undefined" ? serverFallback : `${window.location.origin}/v1`;
  }

  const base = raw.replace(/\/+$/, "");
  const withVersion = base.endsWith("/v1") ? base : `${base}/v1`;

  if (!/^https?:\/\//i.test(withVersion)) {
    return typeof window === "undefined" ? serverFallback : `${window.location.origin}/v1`;
  }

  return withVersion;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers: initHeaders, ...init } = options;
  const headers = new Headers(initHeaders);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
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

  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.code ?? "UNKNOWN",
      body.message ?? "Ocurrió un error inesperado",
    );
  }

  return body;
}
