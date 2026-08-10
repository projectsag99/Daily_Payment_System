import "../../core/config/app_config.dart";
import "../../core/network/dio_client.dart";
import "../../core/utils/idempotency.dart";

class PaymentsApi {
  PaymentsApi(this._client);

  final DioClient _client;

  Future<Map<String, dynamic>> create({
    required Map<String, dynamic> body,
    required String idempotencyKey,
    required String deviceId,
  }) async {
    return _client.postJson(
      "/payments",
      body: body,
      headers: {
        "Idempotency-Key": idempotencyKey,
        "X-Device-Id": deviceId,
      },
    );
  }
}

class SyncApi {
  SyncApi(this._client);

  final DioClient _client;

  Future<Map<String, dynamic>> uploadEvents({
    required String deviceId,
    required List<Map<String, dynamic>> events,
  }) async {
    return _client.postJson(
      "/sync/events",
      body: {
        "deviceId": deviceId,
        "events": events,
      },
    );
  }

  Future<Map<String, dynamic>> status({required String deviceId}) async {
    return _client.getJson(
      "/sync/status",
      queryParameters: {"deviceId": deviceId},
    );
  }
}

List<Map<String, dynamic>> buildSyncEventsBatch(
  List<({String clientEventId, Map<String, dynamic> payload, String capturedAt})> items,
) {
  return items
      .map(
        (item) => {
          "clientEventId": item.clientEventId,
          "eventType": AppConfig.syncEventPaymentCreate,
          "payload": item.payload,
          "capturedAt": item.capturedAt,
        },
      )
      .toList();
}

String syncIdempotencyKey(String deviceId, String clientEventId) {
  return buildSyncIdempotencyKey(deviceId, clientEventId);
}
