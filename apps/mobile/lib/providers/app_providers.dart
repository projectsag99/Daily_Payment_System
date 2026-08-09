import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:shared_preferences/shared_preferences.dart";

import "../core/config/app_config.dart";
import "../core/connectivity/connectivity_service.dart";
import "../core/network/dio_client.dart";
import "../core/storage/device_id_service.dart";
import "../core/storage/token_storage.dart";
import "../data/api/cash_box_api.dart";
import "../data/api/clients_api.dart";
import "../data/api/auth_api.dart";
import "../data/api/notifications_api.dart";
import "../data/api/credits_api.dart";
import "../data/api/payments_api.dart";
import "../data/api/receipts_api.dart";
import "../data/api/routes_api.dart";
import "../data/local/pending_payment_store.dart";
import "../data/models/app_notification.dart";
import "../data/models/auth_user.dart";
import "../data/models/cash_box_models.dart";
import "../data/models/client_models.dart";
import "../data/models/pending_client_onboard.dart";
import "../data/models/pending_payment.dart";
import "../data/models/route_models.dart";
import "../data/repositories/auth_repository.dart";
import "../data/repositories/client_onboard_repository.dart";
import "../data/repositories/payment_repository.dart";
import "../data/repositories/routes_repository.dart";
import "../data/services/client_documents_service.dart";
import "../core/notifications/push_notification_service.dart";

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

final creditsApiProvider = Provider<CreditsApi>((ref) {
  return CreditsApi(ref.watch(dioClientProvider));
});

final receiptsApiProvider = Provider<ReceiptsApi>((ref) {
  return ReceiptsApi(ref.watch(dioClientProvider));
});

final clientsApiProvider = Provider<ClientsApi>((ref) {
  return ClientsApi(ref.watch(dioClientProvider));
});

final clientDocumentsServiceProvider = Provider<ClientDocumentsService>((ref) {
  return ClientDocumentsService(ref.watch(clientsApiProvider));
});

final cashBoxApiProvider = Provider<CashBoxApi>((ref) {
  return CashBoxApi(ref.watch(dioClientProvider));
});

final clientDetailProvider =
    FutureProvider.autoDispose.family<ClientDetail, String>((ref, clientId) {
  return ref.watch(clientsApiProvider).getClient(clientId);
});

final clientPaymentsProvider =
    FutureProvider.autoDispose.family<List<ClientPayment>, String>((ref, clientId) {
  return ref.watch(clientsApiProvider).getPayments(clientId);
});

final cashBoxSummaryProvider = FutureProvider.autoDispose
    .family<CashBoxSummary, String?>((ref, routeId) {
  return ref.watch(cashBoxApiProvider).getSummary(routeId: routeId);
});

typedef CashBoxDayQuery = (String date, String? routeId, String? section);

final cashBoxDayDetailsProvider = FutureProvider.autoDispose
    .family<CashBoxDayDetails, CashBoxDayQuery>((ref, query) {
  final (date, routeId, section) = query;
  return ref.watch(cashBoxApiProvider).getDayDetails(
        date,
        routeId: routeId,
        section: section,
      );
});

final cashBoxSpreadsheetProvider = FutureProvider.autoDispose
    .family<CashBoxSpreadsheet, String>((ref, month) {
  return ref.watch(cashBoxApiProvider).getSpreadsheet(month: month);
});

final notificationsApiProvider = Provider<NotificationsApi>((ref) {
  return NotificationsApi(ref.watch(dioClientProvider));
});

final pushNotificationServiceProvider = Provider<PushNotificationService>((ref) {
  return PushNotificationService(
    notificationsApi: ref.watch(notificationsApiProvider),
    deviceIdService: ref.watch(deviceIdServiceProvider),
  );
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

final clientOnboardRepositoryProvider =
    FutureProvider<ClientOnboardRepository>((ref) async {
  final store = await ref.watch(pendingPaymentStoreProvider.future);
  return ClientOnboardRepository(
    store: store,
    connectivity: ref.watch(connectivityServiceProvider),
    clientsApi: ref.watch(clientsApiProvider),
    documentsService: ref.watch(clientDocumentsServiceProvider),
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
      final user = await ref
          .read(authRepositoryProvider)
          .login(email: email, password: password);
      await ref.read(pushNotificationServiceProvider).registerTokenIfAvailable();
      return user;
    });
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }
}

/// null = all visit shifts; otherwise morning | afternoon | evening
final selectedShiftProvider = StateProvider<String?>((ref) => null);

final myRoutesProvider =
    FutureProvider.autoDispose<List<CollectorRoute>>((ref) async {
  final repo = await ref.watch(routesRepositoryProvider.future);
  return repo.getMyRoutesToday();
});

final clientSearchQueryProvider = StateProvider<String>((ref) => "");

final clientSearchResultsProvider =
    FutureProvider.autoDispose<List<RouteClientSearchResult>>((ref) async {
  final query = ref.watch(clientSearchQueryProvider);
  final selectedShift = ref.watch(selectedShiftProvider);
  if (query.trim().length < 2) return [];
  final repo = await ref.watch(routesRepositoryProvider.future);
  final results = await repo.searchMyClients(query);
  if (selectedShift == null) return results;
  return results
      .where((result) => result.visitShift == selectedShift)
      .toList();
});

final pendingCountProvider = FutureProvider<int>((ref) async {
  final paymentRepo = await ref.watch(paymentRepositoryProvider.future);
  final clientRepo = await ref.watch(clientOnboardRepositoryProvider.future);
  final paymentPending = await paymentRepo.pendingCount();
  final clientPending = await clientRepo.pendingCount();
  return paymentPending + clientPending;
});

final failedSyncCountProvider = FutureProvider<int>((ref) async {
  final paymentRepo = await ref.watch(paymentRepositoryProvider.future);
  final clientRepo = await ref.watch(clientOnboardRepositoryProvider.future);
  final paymentFailed = await paymentRepo.failedCount();
  final clientFailed = await clientRepo.failedCount();
  return paymentFailed + clientFailed;
});

final syncQueueProvider =
    FutureProvider.autoDispose<List<PendingPayment>>((ref) async {
  final repo = await ref.watch(paymentRepositoryProvider.future);
  return repo.listSyncQueue();
});

final clientOnboardSyncQueueProvider =
    FutureProvider.autoDispose<List<PendingClientOnboard>>((ref) async {
  final repo = await ref.watch(clientOnboardRepositoryProvider.future);
  return repo.listSyncQueue();
});

final notificationsProvider =
    FutureProvider.autoDispose<List<AppNotification>>((ref) async {
  final api = ref.watch(notificationsApiProvider);
  final response = await api.list(page: 1, limit: 50);
  return response.items;
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
    final paymentRepo = await _ref.read(paymentRepositoryProvider.future);
    final clientRepo = await _ref.read(clientOnboardRepositoryProvider.future);
    final paymentResult = await paymentRepo.flushPending();
    final clientResult = await clientRepo.flushPending();
    _ref.invalidate(pendingCountProvider);
    _ref.invalidate(failedSyncCountProvider);
    _ref.invalidate(syncQueueProvider);
    _ref.invalidate(clientOnboardSyncQueueProvider);
    _ref.invalidate(myRoutesProvider);
    return FlushResult(
      skippedOffline: paymentResult.skippedOffline && clientResult.skippedOffline,
      synced: paymentResult.synced + clientResult.synced,
      failed: paymentResult.failed + clientResult.failed,
    );
  }

  Future<FlushResult> retryPayment(String clientEventId) async {
    final repo = await _ref.read(paymentRepositoryProvider.future);
    final result = await repo.retryPayment(clientEventId);
    _ref.invalidate(pendingCountProvider);
    _ref.invalidate(failedSyncCountProvider);
    _ref.invalidate(syncQueueProvider);
    _ref.invalidate(clientOnboardSyncQueueProvider);
    _ref.invalidate(myRoutesProvider);
    return result;
  }

  Future<ClientOnboardFlushResult> retryClientOnboard(String clientEventId) async {
    final repo = await _ref.read(clientOnboardRepositoryProvider.future);
    final result = await repo.retryOnboard(clientEventId);
    _ref.invalidate(pendingCountProvider);
    _ref.invalidate(failedSyncCountProvider);
    _ref.invalidate(syncQueueProvider);
    _ref.invalidate(clientOnboardSyncQueueProvider);
    _ref.invalidate(myRoutesProvider);
    return result;
  }
}
