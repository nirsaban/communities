import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../events/presentation/providers/event_providers.dart';

/// Spec: design-specs/AdminEventDetail.json — admin landing for an event with quick-jump
/// shortcuts to edit / pricing / attendees / materials / qa / recap / assign / refund.
class AdminEventDetailScreen extends ConsumerWidget {
  const AdminEventDetailScreen({super.key, required this.eventId});
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
          title: Text(S.adminEventDetailTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(eventDetailProvider(eventId))),
          data: (event) => SafeArea(
            top: false,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: p.surface,
                    borderRadius: AppRadius.brMd,
                    border: Border.all(color: p.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(event.title, style: t.titleMedium!.copyWith(fontSize: 17, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 4),
                      Text(
                        '${event.startAt.day}/${event.startAt.month}/${event.startAt.year} · ${event.metrics.rsvpCount} הרשמות · ${event.metrics.paidCount} משלמים',
                        style: t.bodyMedium!.copyWith(color: p.muted, fontSize: 12.5),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                _RowCard(rows: [
                  (Symbols.edit_rounded, S.adminEditEvent, '/admin/events/${event.id}/edit'),
                  (Symbols.attach_money_rounded, S.adminEditPricing, '/admin/events/${event.id}/pricing'),
                  (Symbols.shield_person_rounded, S.adminAssignManager, '/admin/events/${event.id}/assign'),
                  (Symbols.payments_rounded, S.adminIssueRefund, '/admin/events/${event.id}/refund'),
                ]),
                const SizedBox(height: 14),
                _RowCard(rows: [
                  (Symbols.groups_rounded, S.adminViewAttendees, '/manage/events/${event.id}/attendees'),
                  (Symbols.folder_open_rounded, S.adminViewMaterials, '/events/${event.id}/materials'),
                  (Symbols.help_rounded, S.adminViewQA, '/manage/events/${event.id}/qa'),
                  (Symbols.summarize_rounded, S.adminViewRecap, '/manage/events/${event.id}/recap'),
                ]),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RowCard extends StatelessWidget {
  const _RowCard({required this.rows});
  final List<(IconData, String, String)> rows;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            InkWell(
              borderRadius: AppRadius.brMd,
              onTap: () => GoRouter.of(context).push(rows[i].$3),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                child: Row(
                  children: [
                    Icon(rows[i].$1, color: p.accentInk, size: 22),
                    const SizedBox(width: 12),
                    Expanded(child: Text(rows[i].$2, style: t.bodyMedium!.copyWith(fontSize: 14.5))),
                    Icon(Symbols.chevron_left_rounded, color: p.muted, size: 22),
                  ],
                ),
              ),
            ),
            if (i < rows.length - 1)
              Container(height: 1, margin: const EdgeInsetsDirectional.only(start: 46), color: p.border),
          ],
        ],
      ),
    );
  }
}
