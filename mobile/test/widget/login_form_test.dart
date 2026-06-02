import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:community_app/commons.dart';
import 'package:community_app/core/i18n/strings.dart';
import 'package:community_app/core/network/api_client.dart';
import 'package:community_app/core/network/token_store.dart';
import 'package:community_app/data/repositories/auth_repository.dart';
import 'package:community_app/data/models/auth_dto.dart';
import 'package:community_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:community_app/features/auth/presentation/screens/login_screen.dart';

class _StubAuthRepository implements AuthRepository {
  String? lastEmail;
  String? lastPassword;
  bool throwOnLogin = false;

  @override
  Future<AuthSessionDto> login({required String email, required String password}) async {
    lastEmail = email;
    lastPassword = password;
    if (throwOnLogin) {
      throw Exception('Invalid email or password');
    }
    return AuthSessionDto(
      user: UserDto(id: '1', email: email, name: 'X', globalRole: 'user', status: 'active'),
      tokens: AuthTokensDto(
        accessToken: 'a',
        refreshToken: 'r',
        refreshExpiresAt: DateTime.now().add(const Duration(days: 1)),
      ),
    );
  }

  @override
  Future<AuthSessionDto> register({
    required String email,
    required String password,
    String? name,
  }) async {
    return login(email: email, password: password);
  }

  @override
  Future<({UserDto user, List<MembershipDto> memberships})> me() async {
    return (
      user: UserDto(id: '1', email: lastEmail ?? '', name: '', globalRole: 'user', status: 'active'),
      memberships: <MembershipDto>[],
    );
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

void main() {
  testWidgets('shows validation errors when fields are empty', (tester) async {
    final stub = _StubAuthRepository();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(stub),
          tokenStoreProvider.overrideWithValue(InMemoryTokenStore()),
        ],
        child: MaterialApp(
          theme: AppTheme.light(),
          home: const Directionality(
            textDirection: TextDirection.rtl,
            child: LoginScreen(),
          ),
        ),
      ),
    );
    // Locked AppButton renders the label inside an InkWell. There are several
    // InkWells on the screen (TextButton, etc.) so we tap directly on the label.
    await tester.tap(find.text(S.signInCta));
    await tester.pump();
    expect(find.text(S.emailRequired), findsOneWidget);
    expect(stub.lastEmail, isNull);
  });
}
