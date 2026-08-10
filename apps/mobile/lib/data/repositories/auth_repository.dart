import "../../core/network/api_error.dart";
import "../../core/storage/token_storage.dart";
import "../api/auth_api.dart";
import "../models/auth_user.dart";

class AuthRepository {
  AuthRepository({
    required AuthApi authApi,
    required TokenStorage tokenStorage,
  })  : _authApi = authApi,
        _tokenStorage = tokenStorage;

  final AuthApi _authApi;
  final TokenStorage _tokenStorage;

  Future<AuthUser> login({
    required String email,
    required String password,
  }) async {
    final result = await _authApi.login(email: email, password: password);
    if (result.user.role != "collector") {
      throw ApiError(
        statusCode: 403,
        code: "FORBIDDEN",
        message: "Esta app es solo para cobradores",
      );
    }
    await _tokenStorage.saveTokens(
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    );
    return result.user;
  }

  Future<AuthUser?> restoreSession() async {
    final token = await _tokenStorage.getAccessToken();
    if (token == null || token.isEmpty) return null;
    try {
      return await _authApi.me();
    } catch (_) {
      final refreshed = await tryRefresh();
      if (!refreshed) {
        await _tokenStorage.clear();
        return null;
      }
      return _authApi.me();
    }
  }

  Future<bool> tryRefresh() async {
    final refreshToken = await _tokenStorage.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return false;
    try {
      final result = await _authApi.refresh(refreshToken);
      await _tokenStorage.saveTokens(
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> logout() async {
    final refreshToken = await _tokenStorage.getRefreshToken();
    await _authApi.logout(refreshToken: refreshToken);
    await _tokenStorage.clear();
  }
}
