import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';

/// Spec: design-specs/SuspendedCommunity.json (route "/c/:slug", role: member).
/// Shown to a member when a Super Admin has suspended their community.
class SuspendedCommunityScreen extends StatelessWidget {
  const SuspendedCommunityScreen({super.key, this.communityId});
  final String? communityId;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 60, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: IconBlob(
                    icon: Symbols.warning_rounded,
                    bg: p.warningWash,
                    color: p.warning,
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  S.suspendedCommunityHeadline,
                  textAlign: TextAlign.center,
                  style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                Text(
                  S.suspendedCommunityBody,
                  textAlign: TextAlign.center,
                  style: t.bodyLarge!.copyWith(color: p.muted, height: 1.6),
                ),
                const SizedBox(height: 32),
                AppButton.secondary(
                  S.suspendedOtherCta,
                  icon: Symbols.groups_rounded,
                  onPressed: () => GoRouter.of(context).go('/communities'),
                ),
                const SizedBox(height: 10),
                AppButton.ghost(
                  S.suspendedSupportCta,
                  onPressed: () {},
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
