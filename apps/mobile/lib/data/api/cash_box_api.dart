import "dart:io";

import "package:dio/dio.dart";

import "../../core/network/api_error.dart";
import "../../core/network/dio_client.dart";
import "../models/cash_box_models.dart";
import "../models/onboard_models.dart";

class CashBoxApi {
  CashBoxApi(this._client);

  final DioClient _client;

  Future<CashBoxSummary> getSummary({String? routeId}) async {
    final json = await _client.getJson(
      "/cash-box/summary",
      queryParameters: {
        if (routeId != null) "routeId": routeId,
      },
    );
    return CashBoxSummary.fromJson(json);
  }

  Future<CashBoxDayDetails> getDayDetails(
    String date, {
    String? routeId,
    String? section,
  }) async {
    final json = await _client.getJson(
      "/cash-box/days/$date",
      queryParameters: {
        if (routeId != null) "routeId": routeId,
        if (section != null) "section": section,
      },
    );
    return CashBoxDayDetails.fromJson(json);
  }

  Future<CashBoxExpenseRecord> createExpense({
    required String expenseDate,
    required double amount,
    required String description,
    String? routeId,
    List<File> receiptPhotos = const [],
  }) async {
    try {
      final json = await _client.postJson(
        "/cash-box/expenses",
        body: {
          "expenseDate": expenseDate,
          "amount": amount,
          "description": description,
          "category": "office",
          if (routeId != null) "routeId": routeId,
        },
      );
      final created = CashBoxExpenseRecord.fromJson(json);

      if (receiptPhotos.isNotEmpty) {
        try {
          await _uploadReceiptsPresigned(created.id, receiptPhotos);
        } catch (error) {
          try {
            await deleteExpense(created.id);
          } catch (_) {}
          rethrow;
        }
      }

      return created;
    } on ApiError {
      rethrow;
    } on DioException catch (error) {
      throw _mapDioError(error);
    }
  }

  Future<void> _uploadReceiptsPresigned(
    String expenseId,
    List<File> receiptPhotos,
  ) async {
    final rawUploadClient = Dio(
      BaseOptions(
        sendTimeout: const Duration(seconds: 120),
        receiveTimeout: const Duration(seconds: 60),
      ),
    );

    for (var i = 0; i < receiptPhotos.length; i++) {
      final file = receiptPhotos[i];
      final mimeType = _guessMimeType(file.path);
      final fileName = _fileName(file.path, i);
      final bytes = await file.readAsBytes();

      Map<String, dynamic> urlJson;
      try {
        urlJson = await _client.postJson(
          "/cash-box/expenses/$expenseId/receipts/upload-url",
          body: {
            "mimeType": mimeType,
            "fileName": fileName,
          },
        );
      } on ApiError {
        rethrow;
      } on DioException catch (error) {
        throw _mapDioError(error);
      }

      final uploadUrl = urlJson["uploadUrl"] as String;
      final storageKey = urlJson["storageKey"] as String;

      try {
        final response = await rawUploadClient.put<void>(
          uploadUrl,
          data: bytes,
          options: Options(
            headers: {"Content-Type": mimeType},
            validateStatus: (status) => status != null && status >= 200 && status < 300,
          ),
        );
        final status = response.statusCode ?? 500;
        if (status < 200 || status >= 300) {
          throw ApiError(
            statusCode: status,
            code: "UPLOAD_FAILED",
            message: "No se pudo subir la factura al almacenamiento",
          );
        }
      } on DioException catch (error) {
        throw _mapDioError(error);
      }

      try {
        await _client.postJson(
          "/cash-box/expenses/$expenseId/receipts/confirm",
          body: {
            "storageKey": storageKey,
            "mimeType": mimeType,
            "originalFileName": fileName,
            "fileSizeBytes": bytes.length,
          },
        );
      } on ApiError {
        rethrow;
      } on DioException catch (error) {
        throw _mapDioError(error);
      }
    }
  }

  Future<void> deleteExpense(String expenseId) async {
    await _client.deleteJson("/cash-box/expenses/$expenseId");
  }

  Future<CashBoxSpreadsheet> getSpreadsheet({required String month}) async {
    final json = await _client.getJson(
      "/cash-box/spreadsheet",
      queryParameters: {"month": month},
    );
    return CashBoxSpreadsheet.fromJson(json);
  }

  Future<List<int>> fetchReceiptBytes({
    required String expenseId,
    required String receiptId,
  }) async {
    try {
      final response = await _client.dio.get<List<int>>(
        "/cash-box/expenses/$expenseId/receipts/$receiptId/content",
        options: Options(responseType: ResponseType.bytes),
      );
      return response.data ?? [];
    } on DioException catch (error) {
      throw _mapDioError(error);
    }
  }

  static String _guessMimeType(String path) {
    final lower = path.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".heic") || lower.endsWith(".heif")) {
      return "image/heic";
    }
    return "image/jpeg";
  }

  static String _fileName(String path, int index) {
    final name = path.split(Platform.pathSeparator).last;
    if (name.isNotEmpty) return name;
    return "factura-$index.jpg";
  }

  static ApiError _mapDioError(DioException error) {
    return DioClient.apiErrorFromDio(error) ??
        ApiError(
          statusCode: error.response?.statusCode ?? 500,
          code: "NETWORK_ERROR",
          message: error.message ?? "Error de conexión",
        );
  }
}
