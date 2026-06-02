import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/community_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../communities/presentation/providers/community_providers.dart';
import '../../../events/presentation/widgets/segmented_control.dart';

enum MyRsvpsBucket { upcoming, past }

/// Spec: design-specs/MyRSVPs.json (route "/me/rsvps"). BackButton,
/// SegmentedControl(Upcoming/Past), EventCard list w/ status badge.
class MyRsvpsScreen extends ConsumerStatefulWidget {
  const MyRsvpsScreen({super.key});

  @override
  ConsumerState<MyRsvpsScreen> createState() => _State();
}

class _State extends ConsumerState<MyRsvpsScreen> {
  MyRsvpsBucket _bucket = MyRsvpsBucket.upcoming;

  String _bucketKey(MyRsvpsBucket b) => b == MyRsvpsBucket.past ? 'past' : 'upcoming';

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final query = MyRsvpsQuery(bucket: _bucketKey(_bucket));
    final async = ref.watch(myRsvpsProvider(query));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.myRsvpsTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                child: SegmentedControl<MyRsvpsBucket>(
                  value: _bucket,
                  options: const [MyRsvpsBucket.upcoming, MyRsvpsBucket.past],
                  labels: const [S.eventsUpcoming, S.eventsPast],
                  onChanged: (v) => setState(() => _bucket = v),
                ),
              ),
              Expanded(
                child: async.when(
                  loading: () => const _Loading(),
                  error: (e, _) => ErrorState(onRetry: () => ref.invalidate(myRsvpsProvider(query))),
                  data: (rows) {
                    if (rows.isEmpty) {
                      return const _EmptyRsvps();
                    }
                    return RefreshIndicator(
                      onRefresh: () async {
                        ref.invalidate(myRsvpsProvider(query));
                        await ref.read(myRsvpsProvider(query).future);
                      },
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                        itemCount: rows.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) => _RsvpCard(entry: rows[i]),
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

class _RsvpCard extends StatelessWidget {
  const _RsvpCard({required this.entry});
  final MyRsvpEntry entry;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final ev = entry.event;
    return InkWell(
      borderRadius: AppRadius.brMd,
      onTap: () => GoRouter.of(context).push('/events/${ev.id}'),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: AppRadius.brMd,
          border: Border.all(color: p.border),
          boxShadow: AppShadows.low(dark: dark),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: p.surface2,
                borderRadius: BorderRadius.circular(10),
              ),
              alignment: Alignment.center,
              child: ev.coverImageUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image.network(ev.coverImageUrl!, fit: BoxFit.cover, width: 56, height: 56),
                    )
                  : Icon(Symbols.event_rounded, color: p.muted),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _formatDate(ev.startAt),
                    style: t.labelSmall!.copyWith(
                      color: p.accentInk,
                      fontSize: 11.5,
                      letterSpacing: 0.4,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    ev.title,
                    style: t.titleMedium!.copyWith(fontSize: 15, fontWeight: FontWeight.w700),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (ev.locationLabel != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Symbols.place_rounded, size: 14, color: p.muted),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            ev.locationLabel!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: t.bodyMedium!.copyWith(color: p.muted, fontSize: 12.5),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 6),
                  _StatusBadge(entry: entry),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({required this.entry});
  final MyRsvpEntry entry;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    String label;
    Color bg;
    Color fg;
    if (entry.paymentStatus == 'paid') {
      label = S.rsvpStatusPaid;
      bg = p.successWash;
      fg = p.success;
    } else if (entry.isWaitlisted) {
      label = S.rsvpStatusWaitlist;
      bg = p.warningWash;
      fg = p.warning;
    } else {
      label = S.rsvpStatusGoing;
      bg = p.accentWash;
      fg = p.accentInk;
    }
    return Container(
      height: 22,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(color: bg, borderRadius: AppRadius.brFull),
      alignment: Alignment.center,
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}

class _Loading extends StatelessWidget {
  const _Loading();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      itemCount: 4,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => const LoadingShimmer(height: 88, radius: AppRadius.md),
    );
  }
}

class _EmptyRsvps extends StatelessWidget {
  const _EmptyRsvps();

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Symbols.event_busy_rounded,
      headline: S.myRsvpsEmptyHeadline,
      body: S.myRsvpsEmptyBody,
    );
  }
}

String _formatDate(DateTime dt) {
  const months = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  return '${dt.day} ${months[dt.month - 1]} · ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}
