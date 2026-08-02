import { createHash } from "crypto";

export const SYNC_EVENT_PAYMENT_CREATE = "PAYMENT_CREATE";

export type SyncEventResultStatus =
  | "success"
  | "already_applied"
  | "conflict"
  | "error";

export function hashSyncPayload(payload: unknown): string {
  const canonical = JSON.stringify(sortKeys(payload));
  return createHash("sha256").update(canonical).digest("hex");
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys(record[key]);
        return acc;
      }, {});
  }
  return value;
}

export function buildSyncIdempotencyKey(
  deviceId: string,
  clientEventId: string,
): string {
  return `sync:${deviceId}:${clientEventId}`;
}
