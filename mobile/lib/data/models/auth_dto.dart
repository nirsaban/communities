// Plain DTOs that mirror the backend JSON envelopes.

class AuthTokensDto {
  AuthTokensDto({
    required this.accessToken,
    required this.refreshToken,
    required this.refreshExpiresAt,
  });

  final String accessToken;
  final String refreshToken;
  final DateTime refreshExpiresAt;

  factory AuthTokensDto.fromJson(Map<String, dynamic> json) {
    return AuthTokensDto(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      refreshExpiresAt: DateTime.parse(json['refreshExpiresAt'] as String),
    );
  }
}

class UserDto {
  UserDto({
    required this.id,
    required this.email,
    required this.name,
    required this.globalRole,
    required this.status,
    this.photoUrl,
    this.bio,
    this.interests = const [],
  });

  final String id;
  final String email;
  final String name;
  final String globalRole;
  final String status;
  final String? photoUrl;
  final String? bio;
  final List<String> interests;

  factory UserDto.fromJson(Map<String, dynamic> json) {
    return UserDto(
      id: json['id'] as String,
      email: json['email'] as String,
      name: (json['name'] as String?) ?? '',
      globalRole: json['globalRole'] as String,
      status: json['status'] as String,
      photoUrl: json['photoUrl'] as String?,
      bio: json['bio'] as String?,
      interests: (json['interests'] as List?)?.cast<String>() ?? const [],
    );
  }
}

class AuthSessionDto {
  AuthSessionDto({required this.user, required this.tokens});

  final UserDto user;
  final AuthTokensDto tokens;

  factory AuthSessionDto.fromJson(Map<String, dynamic> json) {
    return AuthSessionDto(
      user: UserDto.fromJson(json['user'] as Map<String, dynamic>),
      tokens: AuthTokensDto.fromJson(json['tokens'] as Map<String, dynamic>),
    );
  }
}

class MembershipDto {
  MembershipDto({
    required this.id,
    required this.communityId,
    required this.role,
    required this.status,
  });

  final String id;
  final String communityId;
  final String role;
  final String status;

  factory MembershipDto.fromJson(Map<String, dynamic> json) {
    return MembershipDto(
      id: json['id'] as String,
      communityId: json['communityId'] as String,
      role: json['role'] as String,
      status: json['status'] as String,
    );
  }
}
