/// API and app configuration.
class AppConfig {
  AppConfig._();

  /// Override at build/run time:
  /// `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/v1`
  static const apiBaseUrl = String.fromEnvironment(
    "API_BASE_URL",
    defaultValue: "http://10.0.2.2:3001/v1",
  );

  static const appTimezone = "America/Bogota";
  static const syncEventPaymentCreate = "PAYMENT_CREATE";
  static const maxSyncBatchSize = 50;
}
