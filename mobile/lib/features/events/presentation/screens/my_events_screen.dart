import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/event_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/event_manager_providers.dart';
import '../widgets/segmented_control.dart';

enum _Bucket { upcoming, past }

/// Spec: design-specs/MyEvents.json (route "/manage/events", role: event_manager).
/// Header (displayMedium), RoleAvatar, SegmentedControl(Upcoming/Past), EventManageCard repeat, BottomNav.
class MyEventsScreen extends ConsumerStatefulWidget {
  const MyEventsScreen({super.key});

  @override
  ConsumerState<MyEventsScreen> createState() => _State();
}

class _State extends ConsumerState<MyEventsScreen> {
  _Bucket _bucket = _Bucket.upcoming;

  String _bucketKey(_Bucket b) => b == _Bucket.past ? 'past' : 'upcoming';

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(managedEventsProvider(ManagedEventsQuery(bucket: _bucketKey(_bucket))));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        body: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 6),
                child: Row(
                  children: [
                    Text(
                      S.myEventsTitle,
                      style: t.displayMedium!.copyWith(fontSize: 28),
                    ),
                    const Spacer(),
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(color: p.accentWash, shape: BoxShape.circle),
                      alignment: Alignment.center,
                      child: Icon(Symbols.shield_person_rounded, color: p.accentInk, size: 20),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                child: SegmentedControl<_Bucket>(
                  value: _bucket,
                  options: const [_Bucket.upcoming, _Bucket.past],
                  labels: const [S.eventsUpcoming, S.eventsPast],
                  onChanged: (v) => setState(() => _bucket = v),
                ),
              ),
              Expanded(
                child: async.when(
                  loading: () => const _Loading(),
                  error: (e, _) => ErrorState(
                    onRetry: () => ref.invalidate(
                      managedEventsProvider(ManagedEventsQuery(bucket: _bucketKey(_bucket))),
                    ),
                  ),
                  data: (rows) {
                    if (rows.isEmpty) return const _Empty();
                    return RefreshIndicator(
                      onRefresh: () async {
                        ref.invalidate(managedEventsProvider(
                            ManagedEventsQuery(bucket: _bucketKey(_bucket))));
                        await ref.read(managedEventsProvider(
                            ManagedEventsQuery(bucket: _bucketKey(_bucket))).future);
                      },
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                        itemCount: rows.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) => _ManageCard(event: rows[i]),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ManageCard extends StatelessWidget {
  const _ManageCard({required this.event});
  final EventDto event;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return InkWell(
      borderRadius: AppRadius.brMd,
      onTap: () => GoRouter.of(context).push('/manage/events/${event.id}'),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: AppRadius.brMd,
          border: Border.all(color: p.border),
          boxShadow: AppShadows.low(dark: dark),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(color: p.surface2, borderRadius: BorderRadius.circular(10)),
                  alignment: Alignment.center,
                  child: event.coverImageUrl != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.network(event.coverImageUrl!, width: 48, height: 48, fit: BoxFit.cover),
                        )
                      : Icon(Symbols.event_rounded, color: p.muted),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        event.title,
                        style: t.titleMedium!.copyWith(fontSize: 15, fontWeight: FontWeight.w700),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatDate(event.startAt),
                        style: t.bodyMedium!.copyWith(color: p.muted, fontSize: 12.5),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                _MiniStat(value: '${event.metrics.rsvpCount}', label: S.kpiRsvps),
                const SizedBox(width: 16),
                _MiniStat(value: '${event.metrics.waitlistCount}', label: S.kpiWaitlist),
                if (event.pricing.kind == EventPricingKind.paid) ...[
                  const SizedBox(width: 16),
                  _MiniStat(
                    value: '\$${(event.metrics.totalRevenueCents / 100).toStringAsFixed(0)}',
                    label: 'הכנסות',
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: t.titleMedium!.copyWith(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 2),
        Text(label, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 10.5)),
      ],
    );
  }
}

class _Loading extends StatelessWidget {
  const _Loading();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      itemCount: 3,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => const LoadingShimmer(height: 110, radius: AppRadius.md),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Symbols.event_busy_rounded,
      headline: S.myEventsEmptyHeadline,
      body: S.myEventsEmptyBody,
    );
  }
}

String _formatDate(DateTime dt) {
  const months = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  return '${dt.day} ${months[dt.month - 1]} ${dt.year} · ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}
