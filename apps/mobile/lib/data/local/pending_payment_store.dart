import "dart:convert";

import "package:path/path.dart" as p;
import "package:sqflite/sqflite.dart";

import "../models/pending_payment.dart";

/// Local SQLite store for offline payment queue (Drift-equivalent persistence).
class PendingPaymentStore {
  PendingPaymentStore(this._db);

  final Database _db;

  static const _table = "pending_payments";

  static Future<PendingPaymentStore> open() async {
    final dbPath = await getDatabasesPath();
    final db = await openDatabase(
      p.join(dbPath, "dps_collector.db"),
      version: 1,
      onCreate: (db, version) async {
        await db.execute("""
          CREATE TABLE $_table (
            client_event_id TEXT PRIMARY KEY,
            client_id TEXT NOT NULL,
            client_name TEXT NOT NULL,
            amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            notes TEXT,
            captured_at TEXT NOT NULL,
            status TEXT NOT NULL,
            server_payment_id TEXT,
            error_message TEXT,
            created_at TEXT NOT NULL
          )
        """);
        await db.execute("""
          CREATE TABLE route_cache (
            cache_key TEXT PRIMARY KEY,
            json TEXT NOT NULL,
            fetched_at TEXT NOT NULL
          )
        """);
      },
    );
    return PendingPaymentStore(db);
  }

  Future<void> insert(PendingPayment payment) async {
    await _db.insert(
      _table,
      {
        "client_event_id": payment.clientEventId,
        "client_id": payment.clientId,
        "client_name": payment.clientName,
        "amount": payment.amount,
        "payment_method": payment.paymentMethod,
        "notes": payment.notes,
        "captured_at": payment.capturedAt,
        "status": payment.status.name,
        "server_payment_id": payment.serverPaymentId,
        "error_message": payment.errorMessage,
        "created_at": payment.createdAt.toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.abort,
    );
  }

  Future<List<PendingPayment>> listByStatus(PendingPaymentStatus status) async {
    final rows = await _db.query(
      _table,
      where: "status = ?",
      whereArgs: [status.name],
      orderBy: "created_at ASC",
    );
    return rows.map(PendingPayment.fromMap).toList();
  }

  Future<int> countPending() async {
    final result = await _db.rawQuery(
      "SELECT COUNT(*) AS c FROM $_table WHERE status = ?",
      [PendingPaymentStatus.pending.name],
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }

  Future<void> updateStatus({
    required String clientEventId,
    required PendingPaymentStatus status,
    String? serverPaymentId,
    String? errorMessage,
  }) async {
    await _db.update(
      _table,
      {
        "status": status.name,
        "server_payment_id": serverPaymentId,
        "error_message": errorMessage,
      },
      where: "client_event_id = ?",
      whereArgs: [clientEventId],
    );
  }

  Future<void> cacheRoutes(String cacheKey, Map<String, dynamic> json) async {
    await _db.insert(
      "route_cache",
      {
        "cache_key": cacheKey,
        "json": jsonEncode(json),
        "fetched_at": DateTime.now().toIso8601String(),
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<Map<String, dynamic>?> getCachedRoutes(String cacheKey) async {
    final rows = await _db.query(
      "route_cache",
      where: "cache_key = ?",
      whereArgs: [cacheKey],
      limit: 1,
    );
    if (rows.isEmpty) return null;
    return jsonDecode(rows.first["json"] as String) as Map<String, dynamic>;
  }
}
