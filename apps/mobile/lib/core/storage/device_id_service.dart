import "package:shared_preferences/shared_preferences.dart";
import "package:uuid/uuid.dart";

class DeviceIdService {
  DeviceIdService(this._prefs);

  final SharedPreferences _prefs;
  static const _key = "dps_device_id";

  Future<String> getOrCreate() async {
    final existing = _prefs.getString(_key);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }
    final id = const Uuid().v4();
    await _prefs.setString(_key, id);
    return id;
  }
}
