import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:community_app/core/network/api_client.dart';
import 'package:community_app/core/network/token_store.dart';
import 'package:community_app/data/models/auth_dto.dart';
import 'package:community_app/data/repositories/auth_repository.dart';
import 'package:community_app/features/auth/presentation/providers/auth_providers.dart';

class _FakeAuthRepository implements AuthRepository {
  _FakeAuthRepository({this.loginResponse, this.loginError});
  AuthSessionDto? loginResponse;
  Object? loginError;

  @override
  Future<AuthSessionDto> login({required String email, required String password}) async {
    if (loginError != null) throw loginError!;
    return loginResponse!;
  }

  @override
  Future<AuthSessionDto> register({
    required String email,
    required String password,
    String? name,
  }) async {
    if (loginError != null) throw loginError!;
    return loginResponse!;
  }

  @override
  Future<({UserDto user, List<MembershipDto> memberships})> me() async {
    final session = loginResponse!;
    return (user: session.user, memberships: <MembershipDto>[]);
  }

  @override
  Future<RefreshResult?> refresh(String refreshToken) async => null;

  @override
  Future<void> logout({String? refreshToken}) async {}

  @override
  Future<void> forgotPassword(String email) async {}

  @override
  Future<void> resetPassword({required String token, required String newPassword}) async {}

  @override
  Future<UserDto> updateMe({String? name, String? bio, String? photoUrl, List<String>? interests}) async {
    throw UnimplementedError();
  }
}

AuthSessionDto _session() => AuthSessionDto(
      user: UserDto(
        id: 'u1',
        email: 'a@b.co',
        name: 'A',
        globalRole: 'user',
        status: 'active',
      ),
      tokens: AuthTokensDto(
        accessToken: 'access',
        refreshToken: 'refresh',
        refreshExpiresAt: DateTime.now().add(const Duration(days: 30)),
      ),
    );

void main() {
  group('AuthNotifier', () {
    test('login: success → AuthAuthenticated and tokens persisted', () async {
      final store = InMemoryTokenStore();
      final notifier = AuthNotifier(
        repo: _FakeAuthRepository(loginResponse: _session()),
        tokenStore: store,
      );
      await notifier.login(email: 'a@b.co', password: 'Password1!');
      expect(notifier.state, isA<AuthAuthenticated>());
      expect(await store.readAccessToken(), 'access');
      expect(await store.readRefreshToken(), 'refresh');
    });

    test('login: failure → AuthUnauthenticated with error', () async {
      final store = InMemoryTokenStore();
      final notifier = AuthNotifier(
        repo: _FakeAuthRepository(
          loginError: DioException(requestOptions: RequestOptions(path: '/')),
        ),
        tokenStore: store,
      );
      await notifier.login(email: 'a@b.co', password: 'bad');
      expect(notifier.state, isA<AuthUnauthenticated>());
    });

    test('logout: clears tokens and goes Unauthenticated', () async {
      final store = InMemoryTokenStore();
      await store.write(accessToken: 'a', refreshToken: 'r');
      final notifier = AuthNotifier(
        repo: _FakeAuthRepository(loginResponse: _session()),
        tokenStore: store,
      );
      await notifier.logout();
      expect(notifier.state, isA<AuthUnauthenticated>());
      expect(await store.readAccessToken(), isNull);
    });
  });
}
