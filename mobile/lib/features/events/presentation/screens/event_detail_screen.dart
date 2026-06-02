import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/event_dto.dart';
import '../../../../data/repositories/event_repository.dart';
import '../providers/event_providers.dart';

/// Spec: design-specs/EventDetail.json (route "/events/:id", role: member)
///   + design-specs/FullCapacityWaitlist.json (state "full" of same screen).
///
/// Cover (288, full-bleed, r=0) → top-row glass nav (Back/Share/Bookmark) →
/// status chip + title (displayMedium) → DateRow + LocationRow → AboutText →
/// SpeakerList → StickyPayBar (footer) with the RSVPButton or JoinWaitlistButton.
class EventDetailScreen extends ConsumerStatefulWidget {
  const EventDetailScreen({super.key, required this.eventId});
  final String eventId;

  @override
  ConsumerState<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends ConsumerState<EventDetailScreen> {
  bool _rsvping = false;

  Future<void> _onRsvp(EventDto event) async {
    if (_rsvping) return;
    // For paid events, route to the dedicated Checkout screen (PRD 09 §6.1).
    if (event.pricing.kind == EventPricingKind.paid && !event.viewer.isAttending) {
      context.push('/events/${event.id}/checkout');
      return;
    }
    setState(() => _rsvping = true);
    try {
      final outcome = await ref.read(rsvpControllerProvider).rsvp(event.id);
      if (!mounted) return;
      _afterRsvp(outcome, event);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.rsvpFailed)),
      );
    } finally {
      if (mounted) setState(() => _rsvping = false);
      ref.invalidate(eventDetailProvider(widget.eventId));
    }
  }

  void _afterRsvp(RsvpOutcome outcome, EventDto event) {
    if (outcome.isWaitlisted) {
      context.push('/events/${event.id}/waitlist');
    } else if (outcome.rsvp != null) {
      context.push('/events/${event.id}/rsvp');
    }
  }

  Future<void> _onCancelRsvp(EventDto event) async {
    if (_rsvping) return;
    setState(() => _rsvping = true);
    try {
      await ref.read(rsvpControllerProvider).cancel(event.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.rsvpCancelled)),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.rsvpFailed)),
      );
    } finally {
      if (mounted) setState(() => _rsvping = false);
      ref.invalidate(eventDetailProvider(widget.eventId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(eventDetailProvider(widget.eventId));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: context.palette.background,
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => SafeArea(
            child: ErrorState(
              onRetry: () => ref.invalidate(eventDetailProvider(widget.eventId)),
            ),
          ),
          data: (event) => _DetailBody(
            event: event,
            rsvping: _rsvping,
            onRsvp: () => _onRsvp(event),
            onCancelRsvp: () => _onCancelRsvp(event),
          ),
        ),
      ),
    );
  }
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({
    required this.event,
    required this.rsvping,
    required this.onRsvp,
    required this.onCancelRsvp,
  });
  final EventDto event;
  final bool rsvping;
  final VoidCallback onRsvp;
  final VoidCallback onCancelRsvp;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final isFull = event.isFull && !event.viewer.isAttending;

    return Stack(
      children: [
        CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: _CoverHeader(event: event, isFullVariant: isFull),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (isFull)
                          _SoldOutChip()
                        else
                          _StatusChipForEvent(event: event),
                        if (event.pricing.kind == EventPricingKind.paid) ...[
                          const SizedBox(width: 8),
                          PriceTag(
                            PriceKind.paid,
                            amount: _formatPrice(event.pricing.priceCents, event.pricing.currency),
                          ),
                        ] else if (event.pricing.kind == EventPricingKind.free) ...[
                          const SizedBox(width: 8),
                          const PriceTag(PriceKind.free),
                        ],
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      event.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: t.displayMedium!.copyWith(fontSize: 26, height: 1.15),
                    ),
                    if (isFull && event.capacity != null) ...[
                      const SizedBox(height: 14),
                      _CapacityBar(
                        filled: event.metrics.rsvpCount,
                        total: event.capacity!,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        S.waitingCount(event.metrics.waitlistCount),
                        style: t.bodyMedium!.copyWith(color: p.muted, fontSize: 13),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: _ListRow(
                icon: Symbols.event_rounded,
                label: S.dateAndTime,
                value: _formatDateRange(event.startAt, event.endAt),
              ),
            ),
            if (event.location.displayLabel != null)
              SliverToBoxAdapter(
                child: _ListRow(
                  icon: event.location.kind == EventLocationKind.online
                      ? Symbols.videocam_rounded
                      : Symbols.place_rounded,
                  label: S.location,
                  value: event.location.displayLabel!,
                ),
              ),
            if (event.description.isNotEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionHeader(S.aboutEvent),
                      Text(
                        event.description,
                        style: t.bodyLarge!.copyWith(height: 1.55, fontSize: 15.5),
                      ),
                    ],
                  ),
                ),
              ),
            if (event.speakers.isNotEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionHeader(S.speakers),
                      ...event.speakers.map(
                        (s) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 6),
                          child: _SpeakerRow(speaker: s),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            if (isFull)
              SliverToBoxAdapter(child: _WaitingNote()),
            const SliverToBoxAdapter(child: SizedBox(height: 140)),
          ],
        ),
        Positioned(
          bottom: 0,
          left: 0,
          right: 0,
          child: _StickyPayBar(
            event: event,
            rsvping: rsvping,
            onRsvp: onRsvp,
            onCancelRsvp: onCancelRsvp,
          ),
        ),
      ],
    );
  }
}

class _CoverHeader extends StatelessWidget {
  const _CoverHeader({required this.event, required this.isFullVariant});
  final EventDto event;
  final bool isFullVariant;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final h = isFullVariant ? 240.0 : 288.0;
    return Stack(
      children: [
        SizedBox(
          height: h,
          width: double.infinity,
          child: event.coverImageUrl != null
              ? Image.network(event.coverImageUrl!, fit: BoxFit.cover)
              : Container(
                  color: p.surface2,
                  child: Center(
                    child: Icon(Symbols.event_rounded, size: 60, color: p.muted),
                  ),
                ),
        ),
        // Gradient overlay for legibility of the top-row icons.
        Positioned.fill(
          child: IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.35),
                    Colors.transparent,
                  ],
                  stops: const [0, 0.4],
                ),
              ),
            ),
          ),
        ),
        SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
            child: Row(
              children: [
                _GlassIcon(
                  icon: Symbols.arrow_forward_rounded,
                  onTap: () {
                    if (GoRouter.of(context).canPop()) {
                      GoRouter.of(context).pop();
                    } else {
                      GoRouter.of(context).go('/events');
                    }
                  },
                ),
                const Spacer(),
                _GlassIcon(icon: Symbols.share_rounded, onTap: () {}),
                const SizedBox(width: 4),
                _GlassIcon(icon: Symbols.bookmark_rounded, onTap: () {}),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _GlassIcon extends StatelessWidget {
  const _GlassIcon({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 40,
      height: 40,
      child: Material(
        color: Colors.white.withValues(alpha: 0.85),
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Icon(icon, size: 22, color: const Color(0xFF14130F)),
        ),
      ),
    );
  }
}

class _StatusChipForEvent extends StatelessWidget {
  const _StatusChipForEvent({required this.event});
  final EventDto event;

  @override
  Widget build(BuildContext context) {
    if (event.isCancelled) return const StatusChip(EventStatus.cancelled);
    if (event.isCompleted) return const StatusChip(EventStatus.completed);
    if (event.status == 'draft') return const StatusChip(EventStatus.draft);
    return const StatusChip(EventStatus.published);
  }
}

class _SoldOutChip extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      height: 24,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: p.errorWash,
        borderRadius: AppRadius.brFull,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Symbols.event_busy_rounded, size: 13, color: p.error),
          const SizedBox(width: 5),
          Text(
            S.soldOut,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 11.5,
              color: p.error,
              height: 1,
            ),
          ),
        ],
      ),
    );
  }
}

class _ListRow extends StatelessWidget {
  const _ListRow({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: p.surface2,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: p.onBackground2),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                const SizedBox(height: 2),
                Text(value, style: t.bodyMedium!.copyWith(fontSize: 14)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SpeakerRow extends StatelessWidget {
  const _SpeakerRow({required this.speaker});
  final EventSpeakerDto speaker;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 24,
          backgroundColor: p.surface2,
          foregroundImage: speaker.photoUrl != null ? NetworkImage(speaker.photoUrl!) : null,
          child: speaker.photoUrl == null
              ? Icon(Symbols.person_rounded, color: p.muted)
              : null,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(speaker.name, style: t.titleMedium!.copyWith(fontSize: 14)),
              if (speaker.bio != null && speaker.bio!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(
                    speaker.bio!,
                    style: t.bodyMedium!.copyWith(color: p.muted, fontSize: 13),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CapacityBar extends StatelessWidget {
  const _CapacityBar({required this.filled, required this.total});
  final int filled;
  final int total;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final ratio = total == 0 ? 0.0 : (filled / total).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: SizedBox(
            height: 8,
            child: Stack(
              children: [
                Container(color: p.surface2),
                FractionallySizedBox(
                  widthFactor: ratio,
                  child: Container(color: p.error),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          S.capacityProgress(filled, total),
          style: Theme.of(context).textTheme.labelSmall!.copyWith(
                color: p.muted,
                fontSize: 11.5,
              ),
        ),
      ],
    );
  }
}

class _WaitingNote extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: p.surface2,
          borderRadius: AppRadius.brMd,
          border: Border.all(color: p.border),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Symbols.hourglass_top_rounded, color: p.muted, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                S.fullCapacityBody,
                style: Theme.of(context).textTheme.bodyMedium!.copyWith(
                      color: p.onBackground2,
                      fontSize: 13.5,
                      height: 1.5,
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StickyPayBar extends StatelessWidget {
  const _StickyPayBar({
    required this.event,
    required this.rsvping,
    required this.onRsvp,
    required this.onCancelRsvp,
  });
  final EventDto event;
  final bool rsvping;
  final VoidCallback onRsvp;
  final VoidCallback onCancelRsvp;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final isAttending = event.viewer.isAttending;
    final isCancelled = event.isCancelled;
    final isFull = event.isFull && !isAttending;
    final isPaid = event.pricing.kind == EventPricingKind.paid;
    final isExternal = event.pricing.kind == EventPricingKind.external;
    final isSubOnly = event.pricing.kind == EventPricingKind.subscriptionOnly;

    String label;
    VoidCallback? onTap;
    if (isCancelled) {
      label = S.eventCancelled;
      onTap = null;
    } else if (isAttending) {
      label = S.rsvpCancel;
      onTap = rsvping ? null : onCancelRsvp;
    } else if (isFull) {
      label = S.rsvpJoinWaitlist;
      onTap = rsvping ? null : onRsvp;
    } else if (isExternal) {
      label = S.rsvpExternal;
      onTap = rsvping ? null : onRsvp;
    } else if (isSubOnly) {
      label = S.rsvpSubscriptionOnly;
      onTap = rsvping ? null : onRsvp;
    } else if (isPaid) {
      label = S.rsvpPaid;
      onTap = rsvping ? null : onRsvp;
    } else {
      label = S.rsvpFree;
      onTap = rsvping ? null : onRsvp;
    }

    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        boxShadow: AppShadows.high(dark: dark),
        border: Border(top: BorderSide(color: p.border)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          child: Row(
            children: [
              if (isPaid && !isAttending && !isFull)
                Padding(
                  padding: const EdgeInsetsDirectional.only(end: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _formatPrice(event.pricing.priceCents, event.pricing.currency),
                        style: Theme.of(context).textTheme.titleMedium!.copyWith(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      Text(
                        'למשתתף',
                        style: Theme.of(context).textTheme.labelSmall!.copyWith(
                              color: p.muted,
                              fontSize: 11,
                            ),
                      ),
                    ],
                  ),
                ),
              Expanded(
                child: AppButton(
                  label,
                  loading: rsvping,
                  onPressed: onTap,
                  variant: isAttending
                      ? AppButtonVariant.secondary
                      : AppButtonVariant.primary,
                  icon: isFull
                      ? Symbols.hourglass_top_rounded
                      : (isAttending ? Symbols.check_circle_rounded : null),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _formatPrice(int cents, String currency) {
  final amount = (cents / 100).toStringAsFixed((cents % 100 == 0) ? 0 : 2);
  switch (currency.toUpperCase()) {
    case 'EUR':
      return '€$amount';
    case 'ILS':
    default:
      // ILS-only at v1 — fall back to the shekel sign so legacy USD rows still render.
      return '₪$amount';
  }
}

String _formatDateRange(DateTime start, DateTime end) {
  const months = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  final s = '${start.day} ${months[start.month - 1]} ${start.year} · ${start.hour.toString().padLeft(2, '0')}:${start.minute.toString().padLeft(2, '0')}';
  final sameDay = start.year == end.year && start.month == end.month && start.day == end.day;
  if (sameDay) {
    return '$s — ${end.hour.toString().padLeft(2, '0')}:${end.minute.toString().padLeft(2, '0')}';
  }
  final e = '${end.day} ${months[end.month - 1]} ${end.year} · ${end.hour.toString().padLeft(2, '0')}:${end.minute.toString().padLeft(2, '0')}';
  return '$s — $e';
}
