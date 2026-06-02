import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../commons.dart';
import 'current_role.dart';

/// Hides `child` unless the current user holds one of `roles`.
///
/// Renders `fallback` (default: empty 0×0 widget) when the gate is closed so
/// layout doesn't shift visibly for unauthorized viewers.
///
/// USAGE
/// ```dart
/// RoleGuard(
///   roles: const {AppRole.admin, AppRole.superAdmin},
///   child: AdminFAB(),
/// )
/// ```
class RoleGuard extends ConsumerWidget {
  const RoleGuard({
    super.key,
    required this.roles,
    required this.child,
    this.fallback,
  });

  final Set<AppRole> roles;
  final Widget child;
  final Widget? fallback;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final role = ref.watch(currentRoleProvider);
    if (role == null || !roles.contains(role)) {
      return fallback ?? const SizedBox.shrink();
    }
    return child;
  }
}

/// Convenience: admin + super-admin scope.
class AdminOnly extends StatelessWidget {
  const AdminOnly({super.key, required this.child, this.fallback});
  final Widget child;
  final Widget? fallback;

  @override
  Widget build(BuildContext context) {
    return RoleGuard(
      roles: const {AppRole.admin, AppRole.superAdmin},
      fallback: fallback,
      child: child,
    );
  }
}
