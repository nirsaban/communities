import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/event_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/event_providers.dart';

/// Spec: design-specs/EventCommandCenter.json (route "/manage/events/:id", role: event_manager).
/// EventHeaderCard, CheckInKPIs, ActionTileGrid (Attendees/Materials/QA/Recap), BroadcastButton primary.
class EventCommandCenterScreen extends ConsumerWidget {
  const EventCommandCenterScreen({super.key, required this.eventId});
  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(eventDetailProvider(eventId));

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.commandCenter, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(eventDetailProvider(eventId))),
          data: (event) => _Body(event: event),
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.event});
  final EventDto event;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return SafeArea(
      top: false,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
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
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(color: p.accentWash, borderRadius: BorderRadius.circular(10)),
                  alignment: Alignment.center,
                  child: Icon(Symbols.event_rounded, color: p.accentInk),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        event.title,
                        style: t.titleMedium!.copyWith(fontSize: 16, fontWeight: FontWeight.w700),
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
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              _Kpi(value: '${event.metrics.rsvpCount}', label: S.kpiRsvps),
              const SizedBox(width: 12),
              _Kpi(value: '${event.metrics.paidCount}', label: 'משלמים'),
              const SizedBox(width: 12),
              _Kpi(value: '${event.metrics.waitlistCount}', label: S.kpiWaitlist),
            ],
          ),
          const SizedBox(height: 18),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            childAspectRatio: 1.7,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            children: [
              _Tile(
                icon: Symbols.groups_rounded,
                label: S.cmdAttendees,
                onTap: () => GoRouter.of(context).push('/manage/events/${event.id}/attendees'),
              ),
              _Tile(
                icon: Symbols.folder_open_rounded,
                label: S.cmdMaterials,
                onTap: () => GoRouter.of(context).push('/manage/events/${event.id}/materials/new'),
              ),
              _Tile(
                icon: Symbols.help_rounded,
                label: S.cmdQa,
                onTap: () => GoRouter.of(context).push('/manage/events/${event.id}/qa'),
              ),
              _Tile(
                icon: Symbols.summarize_rounded,
                label: S.cmdRecap,
                onTap: () => GoRouter.of(context).push('/manage/events/${event.id}/recap'),
              ),
            ],
          ),
          const SizedBox(height: 18),
          AppButton(
            S.cmdBroadcast,
            icon: Symbols.campaign_rounded,
            onPressed: () => GoRouter.of(context).push('/manage/events/${event.id}/broadcast'),
          ),
        ],
      ),
    );
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({required this.value, required this.label});
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: p.surface,
          borderRadius: AppRadius.brMd,
          border: Border.all(color: p.border),
        ),
        child: Column(
          children: [
            Text(value, style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700)),
            const SizedBox(height: 2),
            Text(label, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11)),
          ],
        ),
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Material(
      color: p.surface,
      borderRadius: AppRadius.brMd,
      child: InkWell(
        borderRadius: AppRadius.brMd,
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: AppRadius.brMd,
            border: Border.all(color: p.border),
          ),
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: p.accentInk, size: 22),
              Text(label, style: t.titleMedium!.copyWith(fontSize: 14, fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      ),
    );
  }
}

String _formatDate(DateTime dt) {
  const months = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  return '${dt.day} ${months[dt.month - 1]} ${dt.year} · ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}
