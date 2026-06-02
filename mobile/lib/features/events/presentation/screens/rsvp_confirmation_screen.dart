import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/event_providers.dart';

/// Spec: design-specs/RSVPConfirmation.json (route "/events/:id/rsvp").
/// CloseButton, SuccessBlob, Title, EventSummaryCard, AddToCalendarButton,
/// ShareChips. Spring-scale check on entry.
class RsvpConfirmationScreen extends ConsumerWidget {
  const RsvpConfirmationScreen({super.key, required this.eventId});
  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(eventDetailProvider(eventId));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: context.palette.background,
        body: SafeArea(
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ErrorState(
              onRetry: () => ref.invalidate(eventDetailProvider(eventId)),
            ),
            data: (event) => _Body(
              title: event.title,
              whenLabel: _formatDateLine(event.startAt),
              locationLabel: event.location.displayLabel,
            ),
          ),
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.title, required this.whenLabel, this.locationLabel});
  final String title;
  final String whenLabel;
  final String? locationLabel;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Column(
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
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 24),
                _SpringScale(
                  child: Center(
                    child: IconBlob(
                      icon: Symbols.check_rounded,
                      bg: p.successWash,
                      color: p.success,
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  S.rsvpConfirmedTitle,
                  textAlign: TextAlign.center,
                  style: t.displayMedium!.copyWith(fontSize: 26),
                ),
                const SizedBox(height: 6),
                Text(
                  S.rsvpConfirmedBody,
                  textAlign: TextAlign.center,
                  style: t.bodyMedium!.copyWith(color: p.muted),
                ),
                const SizedBox(height: 22),
                _EventSummaryCard(
                  title: title,
                  whenLabel: whenLabel,
                  locationLabel: locationLabel,
                ),
                const SizedBox(height: 22),
                AppButton(
                  S.addToCalendar,
                  icon: Symbols.event_available_rounded,
                  onPressed: () {
                    // .ics generation lands with the calendar integration (C2/C4).
                  },
                ),
                const SizedBox(height: 18),
                Center(
                  child: Text(
                    S.shareEvent,
                    style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5, letterSpacing: 0.5),
                  ),
                ),
                const SizedBox(height: 10),
                _ShareChips(),
                const SizedBox(height: 28),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _EventSummaryCard extends StatelessWidget {
  const _EventSummaryCard({required this.title, required this.whenLabel, this.locationLabel});
  final String title;
  final String whenLabel;
  final String? locationLabel;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
        boxShadow: AppShadows.low(dark: dark),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: t.titleMedium!.copyWith(fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          Row(children: [
            Icon(Symbols.event_rounded, size: 16, color: p.muted),
            const SizedBox(width: 6),
            Expanded(child: Text(whenLabel, style: t.bodyMedium!.copyWith(color: p.onBackground2, fontSize: 13.5))),
          ]),
          if (locationLabel != null) ...[
            const SizedBox(height: 6),
            Row(children: [
              Icon(Symbols.place_rounded, size: 16, color: p.muted),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  locationLabel!,
                  style: t.bodyMedium!.copyWith(color: p.onBackground2, fontSize: 13.5),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ]),
          ],
        ],
      ),
    );
  }
}

class _ShareChips extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Wrap(
      alignment: WrapAlignment.center,
      spacing: 10,
      children: [
        _ShareChip(icon: Symbols.share_rounded, label: S.shareEvent, onTap: () {}),
        _ShareChip(icon: Symbols.person_add_rounded, label: S.inviteFriend, onTap: () {}),
      ],
    );
  }
}

class _ShareChip extends StatelessWidget {
  const _ShareChip({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return InkWell(
      borderRadius: AppRadius.brFull,
      onTap: onTap,
      child: Container(
        height: 36,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: AppRadius.brFull,
          border: Border.all(color: p.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: p.onBackground2),
            const SizedBox(width: 6),
            Text(
              label,
              style: Theme.of(context).textTheme.labelLarge!.copyWith(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: p.onBackground2,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SpringScale extends StatefulWidget {
  const _SpringScale({required this.child});
  final Widget child;

  @override
  State<_SpringScale> createState() => _SpringScaleState();
}

class _SpringScaleState extends State<_SpringScale> with SingleTickerProviderStateMixin {
  late final AnimationController _c =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 460))..forward();
  late final Animation<double> _scale = CurvedAnimation(parent: _c, curve: Curves.easeOutBack);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: Tween<double>(begin: 0.6, end: 1).animate(_scale),
      child: widget.child,
    );
  }
}

String _formatDateLine(DateTime dt) {
  const months = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  return '${dt.day} ${months[dt.month - 1]} ${dt.year} · ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}
