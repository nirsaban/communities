import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/event_providers.dart';

/// Spec: design-specs/WaitlistJoined.json (route "/events/:id/waitlist").
/// CloseButton, WaitBlob, Title, PositionCard, NotifyNote (surface2), GotItButton.
class WaitlistJoinedScreen extends ConsumerWidget {
  const WaitlistJoinedScreen({super.key, required this.eventId});
  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(eventDetailProvider(eventId));
    final position = async.maybeWhen(
      data: (e) => e.metrics.waitlistCount,
      orElse: () => 0,
    );

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => GoRouter.of(context).canPop()
                          ? GoRouter.of(context).pop()
                          : GoRouter.of(context).go('/home'),
                      icon: Icon(Symbols.close_rounded, color: p.onBackground),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    children: [
                      const SizedBox(height: 24),
                      Center(
                        child: IconBlob(
                          icon: Symbols.hourglass_top_rounded,
                          bg: p.warningWash,
                          color: p.warning,
                        ),
                      ),
                      const SizedBox(height: 18),
                      Text(
                        S.waitlistJoinedTitle,
                        textAlign: TextAlign.center,
                        style: t.displayMedium!.copyWith(fontSize: 26),
                      ),
                      const SizedBox(height: 18),
                      _PositionCard(position: position),
                      const SizedBox(height: 16),
                      _NotifyNote(),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: AppButton.secondary(
                  S.gotIt,
                  onPressed: () => GoRouter.of(context).canPop()
                      ? GoRouter.of(context).pop()
                      : GoRouter.of(context).go('/home'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PositionCard extends StatelessWidget {
  const _PositionCard({required this.position});
  final int position;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
        boxShadow: AppShadows.low(dark: dark),
      ),
      child: Column(
        children: [
          Text(
            position > 0 ? '#$position' : '#—',
            style: t.displayMedium!.copyWith(fontSize: 36),
          ),
          const SizedBox(height: 6),
          Text(
            S.waitlistPositionBody(position),
            textAlign: TextAlign.center,
            style: t.bodyMedium!.copyWith(color: p.onBackground2, height: 1.5),
          ),
        ],
      ),
    );
  }
}

class _NotifyNote extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: p.surface2,
        borderRadius: AppRadius.brMd,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Symbols.notifications_active_rounded, size: 18, color: p.muted),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              S.waitlistNotifyNote,
              style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                    fontSize: 13.5,
                    color: p.onBackground2,
                    height: 1.5,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}
