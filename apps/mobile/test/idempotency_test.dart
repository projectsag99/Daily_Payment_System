import "package:flutter_test/flutter_test.dart";

import "package:dps_mobile/core/utils/idempotency.dart";

void main() {
  group("buildSyncIdempotencyKey", () {
    test("matches backend sync key format", () {
      const deviceId = "device-123";
      const clientEventId = "evt-456";

      expect(
        buildSyncIdempotencyKey(deviceId, clientEventId),
        "sync:device-123:evt-456",
      );
    });
  });
}
