/** Optional Sentry bootstrap — no-op when DSN is not configured. */

export function initSentry(_options: {
  dsn?: string;
  environment?: string;
}): void {
  // Deferred to hardening phase; API runs without Sentry in local dev.
}
