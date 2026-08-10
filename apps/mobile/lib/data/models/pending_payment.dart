enum PendingPaymentStatus {
  pending,
  synced,
  error,
  conflict,
}

class PendingPayment {
  const PendingPayment({
    required this.clientEventId,
    required this.clientId,
    required this.clientName,
    required this.amount,
    required this.paymentMethod,
    required this.capturedAt,
    required this.status,
    this.notes,
    this.serverPaymentId,
    this.errorMessage,
    required this.createdAt,
  });

  final String clientEventId;
  final String clientId;
  final String clientName;
  final double amount;
  final String paymentMethod;
  final String? notes;
  final String capturedAt;
  final PendingPaymentStatus status;
  final String? serverPaymentId;
  final String? errorMessage;
  final DateTime createdAt;

  Map<String, dynamic> toSyncPayload() {
    return {
      "clientId": clientId,
      "amount": amount,
      "paymentMethod": paymentMethod,
      if (notes != null && notes!.isNotEmpty) "notes": notes,
      "capturedAt": capturedAt,
    };
  }

  factory PendingPayment.fromMap(Map<String, dynamic> map) {
    return PendingPayment(
      clientEventId: map["client_event_id"] as String,
      clientId: map["client_id"] as String,
      clientName: map["client_name"] as String,
      amount: (map["amount"] as num).toDouble(),
      paymentMethod: map["payment_method"] as String,
      notes: map["notes"] as String?,
      capturedAt: map["captured_at"] as String,
      status: PendingPaymentStatus.values.byName(map["status"] as String),
      serverPaymentId: map["server_payment_id"] as String?,
      errorMessage: map["error_message"] as String?,
      createdAt: DateTime.parse(map["created_at"] as String),
    );
  }
}

class SyncEventResult {
  const SyncEventResult({
    required this.clientEventId,
    required this.status,
    this.entityId,
    this.message,
  });

  final String clientEventId;
  final String status;
  final String? entityId;
  final String? message;

  factory SyncEventResult.fromJson(Map<String, dynamic> json) {
    return SyncEventResult(
      clientEventId: json["clientEventId"] as String,
      status: json["status"] as String,
      entityId: json["entityId"] as String?,
      message: json["message"] as String?,
    );
  }
}
