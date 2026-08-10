import "../../core/network/dio_client.dart";
import "../models/route_models.dart";

class RoutesApi {
  RoutesApi(this._client);

  final DioClient _client;

  Future<MyRoutesResponse> myRoutes({String? date, String? shift}) async {
    final json = await _client.getJson(
      "/routes/my",
      queryParameters: {
        if (date != null) "date": date,
        if (shift != null) "shift": shift,
      },
    );
    return MyRoutesResponse.fromJson(json);
  }
}
