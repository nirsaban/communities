import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../providers/admin_providers.dart';

/// Spec: design-specs/SubscriptionManagement.json (admin-only). Lists community
/// subscriptions with status. Sub-admin is blocked at the route layer.
class SubscriptionManagementScreen extends ConsumerWidget {
  const SubscriptionManagementScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final cid = ref.watch(activeCommunityIdProvider);
    if (cid == null) return const Scaffold(body: Center(child: Text(S.noCommunities)));
    final async = ref.watch(communitySubscriptionsProvider(cid));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.subsManagementTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ErrorState(onRetry: () => ref.invalidate(communitySubscriptionsProvider(cid))),
            data: (rows) {
              if (rows.isEmpty) {
                return EmptyState(icon: Symbols.diamond_rounded, headline: S.subsEmpty, body: '');
              }
              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                itemCount: rows.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) => _Row(row: rows[i]),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.row});
  final Map<String, dynamic> row;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final status = (row['status'] as String?) ?? 'unknown';
    final cancelling = (row['cancelAtPeriodEnd'] as bool?) ?? false;
    final plan = (row['plan'] as String?) ?? '—';
    final name = (row['name'] as String?) ?? '';
    final email = (row['email'] as String?) ?? '';
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(color: p.surface2, shape: BoxShape.circle),
            alignment: Alignment.center,
            child: Icon(Symbols.person_rounded, color: p.muted),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name.isEmpty ? email : name, style: t.titleMedium!.copyWith(fontSize: 14, fontWeight: FontWeight.w700)),
                Text(S.planLabel(plan), style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
              ],
            ),
          ),
          Container(
            height: 22,
            padding: const EdgeInsets.symmetric(horizontal: 10),
            decoration: BoxDecoration(
              color: cancelling ? p.warningWash : p.successWash,
              borderRadius: AppRadius.brFull,
            ),
            alignment: Alignment.center,
            child: Text(
              cancelling ? S.subsCancelling : S.statusLabel(status),
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: cancelling ? p.warning : p.success,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
