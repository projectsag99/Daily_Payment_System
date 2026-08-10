/// Builds the same idempotency key used by the backend sync module.
String buildSyncIdempotencyKey(String deviceId, String clientEventId) {
  return "sync:$deviceId:$clientEventId";
}
