import 'package:dio/dio.dart';

import '../../core/network/api_client.dart';
import '../models/auth_dto.dart';

/// Public interface so tests can substitute without depending on private fields.
abstract class AuthRepository {
  Future<AuthSessionDto> register({
    required String email,
    required String password,
    String? name,
  });
  Future<AuthSessionDto> login({required String email, required String password});
  Future<RefreshResult?> refresh(String refreshToken);
  Future<void> logout({String? refreshToken});
  Future<void> forgotPassword(String email);
  Future<void> resetPassword({required String token, required String newPassword});
  Future<({UserDto user, List<MembershipDto> memberships})> me();
  Future<UserDto> updateMe({
    String? name,
    String? bio,
    String? photoUrl,
    List<String>? interests,
  });
}

class DioAuthRepository implements AuthRepository {
  DioAuthRepository(this._client);

  final ApiClient _client;
  Dio get _dio => _client.dio;

  @override
  Future<AuthSessionDto> register({
    required String email,
    required String password,
    String? name,
  }) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/auth/register',
        data: {
          'email': email,
          'password': password,
          if (name != null && name.isNotEmpty) 'name': name,
        },
        options: Options(extra: {'skipAuth': true}),
      );
      return AuthSessionDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<AuthSessionDto> login({required String email, required String password}) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {'email': email, 'password': password},
        options: Options(extra: {'skipAuth': true}),
      );
      return AuthSessionDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<RefreshResult?> refresh(String refreshToken) async {
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
        options: Options(extra: {'skipAuth': true}),
      );
      final tokens = (res.data!['data'] as Map<String, dynamic>)['tokens'] as Map<String, dynamic>;
      return RefreshResult(
        accessToken: tokens['accessToken'] as String,
        refreshToken: tokens['refreshToken'] as String,
      );
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> logout({String? refreshToken}) async {
    try {
      await _dio.post<dynamic>(
        '/auth/logout',
        data: refreshToken != null ? {'refreshToken': refreshToken} : {},
        options: Options(extra: {'skipAuth': true}),
      );
    } catch (_) {
      // Best-effort.
    }
  }

  @override
  Future<void> forgotPassword(String email) async {
    try {
      await _dio.post<dynamic>(
        '/auth/forgot-password',
        data: {'email': email},
        options: Options(extra: {'skipAuth': true}),
      );
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<void> resetPassword({required String token, required String newPassword}) async {
    try {
      await _dio.post<dynamic>(
        '/auth/reset-password',
        data: {'token': token, 'newPassword': newPassword},
        options: Options(extra: {'skipAuth': true}),
      );
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<({UserDto user, List<MembershipDto> memberships})> me() async {
    try {
      final res = await _dio.get<Map<String, dynamic>>('/auth/me');
      final data = res.data!['data'] as Map<String, dynamic>;
      return (
        user: UserDto.fromJson(data['user'] as Map<String, dynamic>),
        memberships: (data['memberships'] as List)
            .map((m) => MembershipDto.fromJson(m as Map<String, dynamic>))
            .toList(),
      );
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }

  @override
  Future<UserDto> updateMe({
    String? name,
    String? bio,
    String? photoUrl,
    List<String>? interests,
  }) async {
    try {
      final res = await _dio.patch<Map<String, dynamic>>(
        '/auth/me',
        data: {
          if (name != null) 'name': name,
          if (bio != null) 'bio': bio,
          if (photoUrl != null) 'photoUrl': photoUrl,
          if (interests != null) 'interests': interests,
        },
      );
      return UserDto.fromJson(res.data!['data'] as Map<String, dynamic>);
    } catch (e) {
      throw ApiClient.mapError(e);
    }
  }
}
