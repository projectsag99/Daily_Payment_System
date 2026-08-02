import {
  buildSyncIdempotencyKey,
  hashSyncPayload,
} from "./sync-event-hash";

describe("sync-event-hash", () => {
  it("hashes payloads deterministically regardless of key order", () => {
    const first = hashSyncPayload({ amount: 150, clientId: "abc" });
    const second = hashSyncPayload({ clientId: "abc", amount: 150 });
    expect(first).toBe(second);
  });

  it("builds stable sync idempotency keys", () => {
    expect(buildSyncIdempotencyKey("device-1", "evt-1")).toBe(
      "sync:device-1:evt-1",
    );
  });
});
