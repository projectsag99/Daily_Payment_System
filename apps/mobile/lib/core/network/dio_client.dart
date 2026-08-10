import "package:dio/dio.dart";

import "../config/app_config.dart";
import "../storage/token_storage.dart";
import "api_error.dart";

typedef RefreshTokens = Future<bool> Function();

class DioClient {
  DioClient({
    required TokenStorage tokenStorage,
    required RefreshTokens onRefreshTokens,
    Dio? dio,
  })  : _tokenStorage = tokenStorage,
        _onRefreshTokens = onRefreshTokens,
        _dio = dio ?? Dio() {
    _dio
      ..options.baseUrl = AppConfig.apiBaseUrl
      ..options.connectTimeout = const Duration(seconds: 15)
      ..options.receiveTimeout = const Duration(seconds: 30)
      ..options.headers = {"Content-Type": "application/json"};

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStorage.getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers["Authorization"] = "Bearer $token";
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401 &&
              error.requestOptions.extra["retried"] != true) {
            final refreshed = await _onRefreshTokens();
            if (refreshed) {
              final token = await _tokenStorage.getAccessToken();
              final opts = error.requestOptions;
              opts.extra["retried"] = true;
              opts.headers["Authorization"] = "Bearer $token";
              try {
                final response = await _dio.fetch(opts);
                return handler.resolve(response);
              } catch (e) {
                return handler.next(error);
              }
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  final Dio _dio;
  final TokenStorage _tokenStorage;
  final RefreshTokens _onRefreshTokens;

  Dio get dio => _dio;

  Future<Map<String, dynamic>> getJson(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    return _unwrap(await _dio.get<Map<String, dynamic>>(
      path,
      queryParameters: queryParameters,
    ));
  }

  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    return _unwrap(await _dio.post<Map<String, dynamic>>(
      path,
      data: body,
      options: Options(headers: headers),
    ));
  }

  Future<Map<String, dynamic>> _unwrap(Response<Map<String, dynamic>> response) {
    final status = response.statusCode ?? 500;
    if (status >= 200 && status < 300) {
      return Future.value(response.data ?? {});
    }
    throw ApiError.fromResponse(status, response.data);
  }
}
