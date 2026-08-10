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
    return typeof window === "undefined"
      ? serverFallback
      : `${window.location.origin}/v1`;
  }

  const base = raw.replace(/\/+$/, "");
  const withVersion = base.endsWith("/v1") ? base : `${base}/v1`;

  if (!/^https?:\/\//i.test(withVersion)) {
    return typeof window === "undefined"
      ? serverFallback
      : `${window.location.origin}/v1`;
  }

  return withVersion;
}
