import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../commons.dart';
import '../../features/auth/presentation/providers/auth_providers.dart';
import 'role_parser.dart';

/// Resolves the caller's effective role for the *currently active community*.
///
/// Super-admins always resolve to [AppRole.superAdmin] (overrides per-community
/// roles). For everyone else, we pick the role attached to the first active
/// membership. A future community-switcher will override this provider via
/// `ProviderScope.overrides`.
final currentRoleProvider = Provider<AppRole?>((ref) {
  final auth = ref.watch(authNotifierProvider);
  if (auth is! AuthAuthenticated) return null;
  if (auth.user.globalRole == 'superadmin') return AppRole.superAdmin;
  if (auth.memberships.isEmpty) return AppRole.member;
  return AppRoleParser.fromToken(auth.memberships.first.role) ?? AppRole.member;
});

/// True when the caller is an admin (or super-admin) of *some* community.
final isAdminProvider = Provider<bool>((ref) {
  final r = ref.watch(currentRoleProvider);
  return r == AppRole.admin || r == AppRole.superAdmin;
});

/// True when the caller must be hidden from financial widgets per PRD 05.
final isBlockedFromFinancialProvider = Provider<bool>((ref) {
  final r = ref.watch(currentRoleProvider);
  return r == AppRole.subAdmin;
});
