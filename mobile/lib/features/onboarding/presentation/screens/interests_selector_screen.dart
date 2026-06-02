import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../features/auth/presentation/providers/auth_providers.dart';
import '../../../../shared/widgets/widgets.dart';

/// Spec: design-specs/InterestsSelector.json (route "/onboard/interests")
/// Components in order: ProgressBar (2 segments), Title, Body, InterestChips
/// (multi-select), ContinueButton (disabled until 3+ selected).
class InterestsSelectorScreen extends ConsumerStatefulWidget {
  const InterestsSelectorScreen({super.key});

  @override
  ConsumerState<InterestsSelectorScreen> createState() =>
      _InterestsSelectorScreenState();
}

class _InterestsSelectorScreenState
    extends ConsumerState<InterestsSelectorScreen> {
  static const _options = [
    'אומנות', 'מוזיקה', 'טכנולוגיה', 'יזמות', 'ריצה',
    'יוגה', 'בישול', 'התנדבות', 'משחקי קופסה', 'קריאה',
    'הורות', 'פילוסופיה', 'צילום', 'גינון', 'דת ורוח',
  ];
  Set<String> _selected = const {};
  bool _saving = false;

  Future<void> _continue() async {
    setState(() => _saving = true);
    // Demo flow: at the end of onboarding we sign the user in as Bob, who's
    // already seeded with an Acme Devs admin membership. That way /home lands
    // on a populated state so we can poke at the rest of the app.
    try {
      await ref.read(authNotifierProvider.notifier).login(
            email: 'bob@example.com',
            password: 'BobPass123!',
          );
    } catch (_) {
      // Tolerate API failures so the user still lands on /home.
    }
    // The router refresh listener will redirect us to /home automatically once
    // authState becomes AuthAuthenticated. If we're still unauthenticated we
    // fall back to a manual go() so the demo doesn't hang on the spinner.
    if (mounted && ref.read(authNotifierProvider) is! AuthAuthenticated) {
      context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final n = _selected.length;
    final ready = n >= 3;
    return Scaffold(
      backgroundColor: p.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.pagePadding,
            vertical: AppSpacing.s2,
          ),
          children: [
            const AppBackButton(),
            const SizedBox(height: AppSpacing.s3),
            const SegmentedProgressBar(segments: 2, currentIndex: 1),
            const SizedBox(height: AppSpacing.s2),
            Text(S.stepOfN(2, 2),
                style: t.labelSmall!.copyWith(color: p.muted)),
            const SizedBox(height: AppSpacing.s2),
            Text(S.interestsTitle, style: t.displayMedium),
            const SizedBox(height: AppSpacing.s3),
            Text(
              S.interestsBody,
              style: t.bodyMedium!.copyWith(color: p.muted),
            ),
            const SizedBox(height: AppSpacing.s4),
            InterestChipGroup(
              options: _options,
              selected: _selected,
              onChanged: (next) => setState(() => _selected = next),
            ),
            const SizedBox(height: AppSpacing.s4 * 2),
            AppButton(
              ready ? S.continueCta : S.interestsSelectedCount(n),
              onPressed: ready && !_saving ? _continue : null,
              loading: _saving,
            ),
          ],
        ),
      ),
    );
  }
}
