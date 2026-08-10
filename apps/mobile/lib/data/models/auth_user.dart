class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.collectorStatus,
  });

  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String? collectorStatus;

  String get fullName => "$firstName $lastName".trim();

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json["id"] as String,
      email: json["email"] as String,
      firstName: json["firstName"] as String,
      lastName: json["lastName"] as String,
      role: json["role"] as String,
      collectorStatus: json["collectorStatus"] as String?,
    );
  }
}

class LoginResult {
  const LoginResult({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  final String accessToken;
  final String refreshToken;
  final AuthUser user;

  factory LoginResult.fromJson(Map<String, dynamic> json) {
    return LoginResult(
      accessToken: json["accessToken"] as String,
      refreshToken: json["refreshToken"] as String,
      user: AuthUser.fromJson(json["user"] as Map<String, dynamic>),
    );
  }
}
