import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:shared_preferences/shared_preferences.dart";

import "../core/config/app_config.dart";
import "../core/connectivity/connectivity_service.dart";
import "../core/network/dio_client.dart";
import "../core/storage/device_id_service.dart";
import "../core/storage/token_storage.dart";
import "../data/api/auth_api.dart";
import "../data/api/payments_api.dart";
import "../data/api/routes_api.dart";
import "../data/local/pending_payment_store.dart";
import "../data/models/auth_user.dart";
import "../data/models/route_models.dart";
import "../data/repositories/auth_repository.dart";
import "../data/repositories/payment_repository.dart";
import "../data/repositories/routes_repository.dart";

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError("SharedPreferences must be overridden in main()");
});

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

final connectivityServiceProvider =
    Provider<ConnectivityService>((ref) => ConnectivityService());

final pendingPaymentStoreProvider =
    FutureProvider<PendingPaymentStore>((ref) async {
  return PendingPaymentStore.open();
});

final dioClientProvider = Provider<DioClient>((ref) {
  final tokenStorage = ref.watch(tokenStorageProvider);
  return DioClient(
    tokenStorage: tokenStorage,
    onRefreshTokens: () async {
      final refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) return false;

      try {
        final dio = Dio(
          BaseOptions(
            baseUrl: AppConfig.apiBaseUrl,
            headers: {"Content-Type": "application/json"},
          ),
        );
        final response = await dio.post<Map<String, dynamic>>(
          "/auth/refresh",
          data: {"refreshToken": refreshToken},
        );
        final data = response.data;
        if (data == null) return false;
        await tokenStorage.saveTokens(
          accessToken: data["accessToken"] as String,
          refreshToken: data["refreshToken"] as String,
        );
        return true;
      } catch (_) {
        return false;
      }
    },
  );
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    authApi: AuthApi(ref.watch(dioClientProvider)),
    tokenStorage: ref.watch(tokenStorageProvider),
  );
});

final routesApiProvider = Provider<RoutesApi>((ref) {
  return RoutesApi(ref.watch(dioClientProvider));
});

final paymentsApiProvider = Provider<PaymentsApi>((ref) {
  return PaymentsApi(ref.watch(dioClientProvider));
});

final syncApiProvider = Provider<SyncApi>((ref) {
  return SyncApi(ref.watch(dioClientProvider));
});

final deviceIdServiceProvider = Provider<DeviceIdService>((ref) {
  return DeviceIdService(ref.watch(sharedPreferencesProvider));
});

final routesRepositoryProvider = FutureProvider<RoutesRepository>((ref) async {
  final store = await ref.watch(pendingPaymentStoreProvider.future);
  return RoutesRepository(
    routesApi: ref.watch(routesApiProvider),
    store: store,
    connectivity: ref.watch(connectivityServiceProvider),
  );
});

final paymentRepositoryProvider =
    FutureProvider<PaymentRepository>((ref) async {
  final store = await ref.watch(pendingPaymentStoreProvider.future);
  return PaymentRepository(
    store: store,
    deviceIdService: ref.watch(deviceIdServiceProvider),
    connectivity: ref.watch(connectivityServiceProvider),
    paymentsApi: ref.watch(paymentsApiProvider),
    syncApi: ref.watch(syncApiProvider),
  );
});

final authStateProvider =
    AsyncNotifierProvider<AuthNotifier, AuthUser?>(AuthNotifier.new);

class AuthNotifier extends AsyncNotifier<AuthUser?> {
  @override
  Future<AuthUser?> build() async {
    return ref.read(authRepositoryProvider).restoreSession();
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      return ref
          .read(authRepositoryProvider)
          .login(email: email, password: password);
    });
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }
}

final myRoutesProvider =
    FutureProvider.autoDispose<List<CollectorRoute>>((ref) async {
  final repo = await ref.watch(routesRepositoryProvider.future);
  return repo.getMyRoutesToday();
});

final pendingCountProvider = FutureProvider<int>((ref) async {
  final repo = await ref.watch(paymentRepositoryProvider.future);
  return repo.pendingCount();
});

final connectivityOnlineProvider = StreamProvider<bool>((ref) {
  return ref.watch(connectivityServiceProvider).onConnectivityChanged;
});

final syncControllerProvider =
    Provider<SyncController>((ref) => SyncController(ref));

class SyncController {
  SyncController(this._ref);

  final Ref _ref;

  Future<FlushResult> flush() async {
    final repo = await _ref.read(paymentRepositoryProvider.future);
    final result = await repo.flushPending();
    _ref.invalidate(pendingCountProvider);
    _ref.invalidate(myRoutesProvider);
    return result;
  }
}
