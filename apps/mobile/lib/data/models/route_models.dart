class RouteClient {
  const RouteClient({
    required this.id,
    required this.code,
    required this.fullName,
    required this.sequenceOrder,
    required this.visitStatus,
    required this.amountDue,
    required this.overdueInstallmentCount,
    this.lat,
    this.lng,
  });

  final String id;
  final String code;
  final String fullName;
  final int sequenceOrder;
  final String visitStatus;
  final double amountDue;
  final int overdueInstallmentCount;
  final double? lat;
  final double? lng;

  factory RouteClient.fromJson(Map<String, dynamic> json) {
    final location = json["location"] as Map<String, dynamic>?;
    return RouteClient(
      id: json["id"] as String,
      code: json["code"] as String,
      fullName: json["fullName"] as String,
      sequenceOrder: json["sequenceOrder"] as int,
      visitStatus: json["visitStatus"] as String,
      amountDue: (json["amountDue"] as num).toDouble(),
      overdueInstallmentCount: json["overdueInstallmentCount"] as int,
      lat: location != null ? (location["lat"] as num).toDouble() : null,
      lng: location != null ? (location["lng"] as num).toDouble() : null,
    );
  }
}

class CollectorRoute {
  const CollectorRoute({
    required this.id,
    required this.name,
    required this.shift,
    required this.clientCount,
    required this.clients,
    this.collectedTodayPct,
  });

  final String id;
  final String name;
  final String shift;
  final int clientCount;
  final double? collectedTodayPct;
  final List<RouteClient> clients;

  factory CollectorRoute.fromJson(Map<String, dynamic> json) {
    final clientsJson = json["clients"] as List<dynamic>? ?? [];
    return CollectorRoute(
      id: json["id"] as String,
      name: json["name"] as String,
      shift: json["shift"] as String,
      clientCount: json["clientCount"] as int? ?? clientsJson.length,
      collectedTodayPct: json["collectedTodayPct"] != null
          ? (json["collectedTodayPct"] as num).toDouble()
          : null,
      clients: clientsJson
          .map((e) => RouteClient.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class MyRoutesResponse {
  const MyRoutesResponse({required this.routes});

  final List<CollectorRoute> routes;

  factory MyRoutesResponse.fromJson(Map<String, dynamic> json) {
    final routesJson = json["routes"] as List<dynamic>? ?? [];
    return MyRoutesResponse(
      routes: routesJson
          .map((e) => CollectorRoute.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
