class ApiError implements Exception {
  ApiError({
    required this.statusCode,
    required this.code,
    required this.message,
  });

  final int statusCode;
  final String code;
  final String message;

  factory ApiError.fromResponse(int statusCode, Map<String, dynamic>? body) {
    return ApiError(
      statusCode: statusCode,
      code: body?["code"] as String? ?? "UNKNOWN",
      message: body?["message"] as String? ?? "Ocurrió un error inesperado",
    );
  }

  @override
  String toString() => message;
}
