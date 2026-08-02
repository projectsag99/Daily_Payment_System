import "package:intl/intl.dart";

import "../../core/config/app_config.dart";
import "../../core/connectivity/connectivity_service.dart";
import "../api/routes_api.dart";
import "../local/pending_payment_store.dart";
import "../models/route_models.dart";

class RoutesRepository {
  RoutesRepository({
    required RoutesApi routesApi,
    required PendingPaymentStore store,
    required ConnectivityService connectivity,
  })  : _routesApi = routesApi,
        _store = store,
        _connectivity = connectivity;

  final RoutesApi _routesApi;
  final PendingPaymentStore _store;
  final ConnectivityService _connectivity;

  String _todayKey() {
    final now = DateTime.now().toUtc().add(const Duration(hours: -5));
    return DateFormat("yyyy-MM-dd").format(now);
  }

  Future<List<CollectorRoute>> getMyRoutesToday() async {
    final date = _todayKey();
    final cacheKey = "routes:$date";

    if (await _connectivity.isOnline) {
      try {
        final response = await _routesApi.myRoutes(date: date);
        await _store.cacheRoutes(cacheKey, {"routes": response.routes.map((r) => _routeToJson(r)).toList()});
        return response.routes;
      } catch (_) {
        // fall through to cache
      }
    }

    final cached = await _store.getCachedRoutes(cacheKey);
    if (cached != null) {
      return MyRoutesResponse.fromJson(cached).routes;
    }

    if (!await _connectivity.isOnline) {
      throw Exception("Sin conexión y sin rutas en caché para hoy");
    }
    rethrow;
  }

  Map<String, dynamic> _routeToJson(CollectorRoute route) {
    return {
      "id": route.id,
      "name": route.name,
      "shift": route.shift,
      "clientCount": route.clientCount,
      "collectedTodayPct": route.collectedTodayPct,
      "clients": route.clients
          .map(
            (c) => {
              "id": c.id,
              "code": c.code,
              "fullName": c.fullName,
              "sequenceOrder": c.sequenceOrder,
              "visitStatus": c.visitStatus,
              "amountDue": c.amountDue,
              "overdueInstallmentCount": c.overdueInstallmentCount,
              if (c.lat != null && c.lng != null)
                "location": {"lat": c.lat, "lng": c.lng},
            },
          )
          .toList(),
    };
  }
}
