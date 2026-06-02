import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'current_role.dart';

/// Mandatory wrapper for any widget that shows revenue / billing / payment
/// info per PRD 05 §6 + DESIGN_LOCK.md "Role-Gating Rules".
///
/// Renders nothing for sub-admins. Admins + super-admins pass through.
/// (Members + event managers don't have access to the routes that mount these
/// widgets, so this guard is principally a safety net against sub-admin leak.)
class FinancialAccessGuard extends ConsumerWidget {
  const FinancialAccessGuard({super.key, required this.child, this.fallback});

  final Widget child;
  final Widget? fallback;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final blocked = ref.watch(isBlockedFromFinancialProvider);
    if (blocked) return fallback ?? const SizedBox.shrink();
    return child;
  }
}
