import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';

/// Spec: design-specs/Unauthorized403.json — wrong-role guard. Names the required
/// role; never leaks content.
class UnauthorizedScreen extends StatelessWidget {
  const UnauthorizedScreen({super.key, this.requiredRole});
  final String? requiredRole;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 60, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: IconBlob(
                    icon: Symbols.lock_rounded,
                    bg: p.warningWash,
                    color: p.warning,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  S.unauthorizedHeadline,
                  textAlign: TextAlign.center,
                  style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                Text(
                  S.unauthorizedBody,
                  textAlign: TextAlign.center,
                  style: t.bodyLarge!.copyWith(color: p.muted, height: 1.55),
                ),
                if (requiredRole != null) ...[
                  const SizedBox(height: 14),
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(color: p.surface2, borderRadius: AppRadius.brFull),
                      child: Text(
                        S.unauthorizedNeedsRole(requiredRole!),
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: p.onBackground2),
                      ),
                    ),
                  ),
                ],
                const Spacer(),
                AppButton(
                  S.errorHomeCta,
                  icon: Symbols.home_rounded,
                  onPressed: () => GoRouter.of(context).go('/home'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
