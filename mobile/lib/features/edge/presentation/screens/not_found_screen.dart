import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';

/// Spec: design-specs/NotFound404.json (route "/404", any role).
/// Neutral low-alarm tone, single way home. Also used as GoRouter errorBuilder.
class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key, this.attemptedPath});
  final String? attemptedPath;

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
                    icon: Symbols.search_off_rounded,
                    bg: p.surface2,
                    color: p.muted,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  S.notFoundHeadline,
                  textAlign: TextAlign.center,
                  style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                Text(
                  S.notFoundBody,
                  textAlign: TextAlign.center,
                  style: t.bodyLarge!.copyWith(color: p.muted, height: 1.55),
                ),
                if (attemptedPath != null) ...[
                  const SizedBox(height: 14),
                  Text(
                    attemptedPath!,
                    textAlign: TextAlign.center,
                    style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11, fontFamily: 'monospace'),
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
