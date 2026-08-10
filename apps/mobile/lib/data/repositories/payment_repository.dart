import "package:uuid/uuid.dart";

import "../../core/config/app_config.dart";
import "../../core/connectivity/connectivity_service.dart";
import "../../core/storage/device_id_service.dart";
import "../../core/utils/idempotency.dart";
import "../api/payments_api.dart";
import "../local/pending_payment_store.dart";
import "../models/pending_payment.dart";

class PaymentRepository {
  PaymentRepository({
    required PendingPaymentStore store,
    required DeviceIdService deviceIdService,
    required ConnectivityService connectivity,
    required PaymentsApi paymentsApi,
    required SyncApi syncApi,
  })  : _store = store,
        _deviceIdService = deviceIdService,
        _connectivity = connectivity,
        _paymentsApi = paymentsApi,
        _syncApi = syncApi;

  final PendingPaymentStore _store;
  final DeviceIdService _deviceIdService;
  final ConnectivityService _connectivity;
  final PaymentsApi _paymentsApi;
  final SyncApi _syncApi;

  Future<PendingPayment> recordPayment({
    required String clientId,
    required String clientName,
    required double amount,
    required String paymentMethod,
    String? notes,
  }) async {
    final clientEventId = const Uuid().v4();
    final capturedAt = DateTime.now().toUtc().toIso8601String();
    final payment = PendingPayment(
      clientEventId: clientEventId,
      clientId: clientId,
      clientName: clientName,
      amount: amount,
      paymentMethod: paymentMethod,
      notes: notes,
      capturedAt: capturedAt,
      status: PendingPaymentStatus.pending,
      createdAt: DateTime.now(),
    );

    // Persist BEFORE any network call
    await _store.insert(payment);

    if (await _connectivity.isOnline) {
      await flushPending();
    }

    final updated = (await _store.listByStatus(PendingPaymentStatus.pending))
        .where((p) => p.clientEventId == clientEventId)
        .toList();
    if (updated.isNotEmpty) return updated.first;

    final synced = await _getByEventId(clientEventId);
    return synced ?? payment;
  }

  Future<PendingPayment?> _getByEventId(String clientEventId) async {
    for (final status in PendingPaymentStatus.values) {
      final items = await _store.listByStatus(status);
      for (final item in items) {
        if (item.clientEventId == clientEventId) return item;
      }
    }
    return null;
  }

  Future<int> pendingCount() => _store.countPending();

  Future<List<PendingPayment>> listPending() =>
      _store.listByStatus(PendingPaymentStatus.pending);

  Future<FlushResult> flushPending() async {
    if (!await _connectivity.isOnline) {
      return FlushResult(skippedOffline: true, synced: 0, failed: 0);
    }

    final deviceId = await _deviceIdService.getOrCreate();
    final pending = await _store.listByStatus(PendingPaymentStatus.pending);
    if (pending.isEmpty) {
      return const FlushResult(synced: 0, failed: 0);
    }

    var synced = 0;
    var failed = 0;

    for (var i = 0; i < pending.length; i += AppConfig.maxSyncBatchSize) {
      final batch = pending.skip(i).take(AppConfig.maxSyncBatchSize).toList();
      final batchResult = await _flushBatch(deviceId, batch);
      synced += batchResult.synced;
      failed += batchResult.failed;
    }

    return FlushResult(synced: synced, failed: failed);
  }

  Future<FlushResult> _flushBatch(
    String deviceId,
    List<PendingPayment> batch,
  ) async {
    var synced = 0;
    var failed = 0;

    // Try direct payment first for single-item immediate feedback
    if (batch.length == 1) {
      final payment = batch.first;
      final idempotencyKey = buildSyncIdempotencyKey(deviceId, payment.clientEventId);
      try {
        final body = await _paymentsApi.create(
          body: payment.toSyncPayload(),
          idempotencyKey: idempotencyKey,
          deviceId: deviceId,
        );
        await _store.updateStatus(
          clientEventId: payment.clientEventId,
          status: PendingPaymentStatus.synced,
          serverPaymentId: body["id"] as String?,
        );
        return const FlushResult(synced: 1, failed: 0);
      } catch (_) {
        // fall through to sync batch
      }
    }

    try {
      final response = await _syncApi.uploadEvents(
        deviceId: deviceId,
        events: batch
            .map(
              (p) => {
                "clientEventId": p.clientEventId,
                "eventType": AppConfig.syncEventPaymentCreate,
                "payload": p.toSyncPayload(),
                "capturedAt": p.capturedAt,
              },
            )
            .toList(),
      );

      final results = (response["results"] as List<dynamic>? ?? [])
          .map((e) => SyncEventResult.fromJson(e as Map<String, dynamic>))
          .toList();

      for (final result in results) {
        if (result.status == "success" || result.status == "already_applied") {
          await _store.updateStatus(
            clientEventId: result.clientEventId,
            status: PendingPaymentStatus.synced,
            serverPaymentId: result.entityId,
          );
          synced++;
        } else if (result.status == "conflict") {
          await _store.updateStatus(
            clientEventId: result.clientEventId,
            status: PendingPaymentStatus.conflict,
            errorMessage: result.message,
          );
          failed++;
        } else {
          await _store.updateStatus(
            clientEventId: result.clientEventId,
            status: PendingPaymentStatus.error,
            errorMessage: result.message,
          );
          failed++;
        }
      }
    } catch (e) {
      failed += batch.length;
    }

    return FlushResult(synced: synced, failed: failed);
  }
}

class FlushResult {
  const FlushResult({
    this.synced = 0,
    this.failed = 0,
    this.skippedOffline = false,
  });

  final int synced;
  final int failed;
  final bool skippedOffline;
}
