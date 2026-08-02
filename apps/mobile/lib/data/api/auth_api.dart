import "../../core/network/api_error.dart";
import "../../core/network/dio_client.dart";
import "../models/auth_user.dart";

class AuthApi {
  AuthApi(this._client);

  final DioClient _client;

  Future<LoginResult> login({
    required String email,
    required String password,
  }) async {
    final json = await _client.postJson(
      "/auth/login",
      body: {"email": email, "password": password},
    );
    return LoginResult.fromJson(json);
  }

  Future<AuthUser> me() async {
    final json = await _client.getJson("/auth/me");
    return AuthUser.fromJson(json);
  }

  Future<LoginResult> refresh(String refreshToken) async {
    final json = await _client.postJson(
      "/auth/refresh",
      body: {"refreshToken": refreshToken},
    );
    return LoginResult.fromJson(json);
  }

  Future<void> logout({String? refreshToken}) async {
    try {
      await _client.postJson(
        "/auth/logout",
        body: refreshToken != null ? {"refreshToken": refreshToken} : {},
      );
    } on ApiError {
      // ignore logout errors locally
    }
  }
}
