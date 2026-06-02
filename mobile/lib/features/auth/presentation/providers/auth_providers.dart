import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_client.dart';
import '../../../../core/network/token_store.dart';
import '../../../../data/models/auth_dto.dart';
import '../../../../data/repositories/auth_repository.dart';

final tokenStoreProvider = Provider<TokenStore>((_) => SecureTokenStore());

// Explicit type breaks Riverpod's inference cycle with authNotifier/repo.
final Provider<ApiClient> apiClientProvider = Provider<ApiClient>((ref) {
  final store = ref.watch(tokenStoreProvider);
  late final ApiClient client;
  client = ApiClient(
    tokenStore: store,
    onSessionInvalidated: () async {
      ref.read(authNotifierProvider.notifier).clear();
    },
    refreshSession: (refreshToken) async {
      // Build the repo against the same client to share the Dio + interceptors.
      final repo = DioAuthRepository(client);
      return repo.refresh(refreshToken);
    },
  );
  ref.onDispose(client.dio.close);
  return client;
});

final Provider<AuthRepository> authRepositoryProvider = Provider<AuthRepository>((ref) {
  return DioAuthRepository(ref.watch(apiClientProvider));
});

/// The state shape exposed by AuthNotifier.
sealed class AuthState {
  const AuthState();
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated({this.error});
  final String? error;
}

class AuthAuthenticated extends AuthState {
  const AuthAuthenticated({required this.user, this.memberships = const []});
  final UserDto user;
  final List<MembershipDto> memberships;
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier({required this.repo, required this.tokenStore}) : super(const AuthInitial());

  final AuthRepository repo;
  final TokenStore tokenStore;

  Future<void> bootstrap() async {
    state = const AuthLoading();
    final access = await tokenStore.readAccessToken();
    if (access == null || access.isEmpty) {
      state = const AuthUnauthenticated();
      return;
    }
    try {
      final me = await repo.me();
      state = AuthAuthenticated(user: me.user, memberships: me.memberships);
    } catch (_) {
      state = const AuthUnauthenticated();
    }
  }

  Future<void> login({required String email, required String password}) async {
    state = const AuthLoading();
    try {
      final session = await repo.login(email: email, password: password);
      await tokenStore.write(
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
      );
      state = AuthAuthenticated(user: session.user);
      // Hydrate memberships in the background; failures aren't fatal here.
      try {
        final me = await repo.me();
        state = AuthAuthenticated(user: me.user, memberships: me.memberships);
      } catch (_) {
        // ignore
      }
    } catch (e) {
      state = AuthUnauthenticated(error: e.toString());
    }
  }

  Future<void> register({required String email, required String password, String? name}) async {
    state = const AuthLoading();
    try {
      final session = await repo.register(email: email, password: password, name: name);
      await tokenStore.write(
        accessToken: session.tokens.accessToken,
        refreshToken: session.tokens.refreshToken,
      );
      state = AuthAuthenticated(user: session.user);
    } catch (e) {
      state = AuthUnauthenticated(error: e.toString());
    }
  }

  Future<void> logout() async {
    final refresh = await tokenStore.readRefreshToken();
    await repo.logout(refreshToken: refresh);
    await tokenStore.clear();
    state = const AuthUnauthenticated();
  }

  Future<void> clear() async {
    await tokenStore.clear();
    state = const AuthUnauthenticated();
  }

  /// PATCH /auth/me — partial profile update. Returns the updated user so callers
  /// can show inline feedback; AuthState is replaced atomically on success.
  Future<UserDto> updateProfile({
    String? name,
    String? bio,
    String? photoUrl,
    List<String>? interests,
  }) async {
    final current = state;
    if (current is! AuthAuthenticated) {
      throw StateError('updateProfile called while not authenticated');
    }
    final updated = await repo.updateMe(
      name: name,
      bio: bio,
      photoUrl: photoUrl,
      interests: interests,
    );
    state = AuthAuthenticated(user: updated, memberships: current.memberships);
    return updated;
  }
}

final StateNotifierProvider<AuthNotifier, AuthState> authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    repo: ref.watch(authRepositoryProvider),
    tokenStore: ref.watch(tokenStoreProvider),
  );
});
