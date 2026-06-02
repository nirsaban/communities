import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/payment_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../../../payments/presentation/providers/payment_providers.dart';

/// Spec: design-specs/FinancialDashboard.json — admin-only. Reuses existing
/// `GET /communities/:cid/finances` (paymentRepository.finances).
class FinancialDashboardScreen extends ConsumerWidget {
  const FinancialDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final cid = ref.watch(activeCommunityIdProvider);
    if (cid == null) return const Scaffold(body: Center(child: Text(S.noCommunities)));
    final async = ref.watch(financesProvider(cid));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.finDashboardTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(financesProvider(cid))),
          data: (snap) => SafeArea(
            top: false,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                Row(
                  children: [
                    Expanded(child: _Kpi(value: _money(snap.totalRevenueCents), label: S.totalRevenue)),
                    const SizedBox(width: 12),
                    Expanded(child: _Kpi(value: _money(snap.revenueThisMonth), label: S.revenueThisMonth)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _Kpi(value: _money(snap.revenueThisWeek), label: S.revenueThisWeek)),
                    const SizedBox(width: 12),
                    Expanded(child: _Kpi(value: '${snap.activeSubscriptions}', label: S.finSubscriptions)),
                  ],
                ),
                const SizedBox(height: 18),
                _Section(title: S.finRevenueByEvent, rows: snap.revenueByEvent),
                const SizedBox(height: 18),
                AppButton.secondary(
                  S.finManageSubs,
                  icon: Symbols.diamond_rounded,
                  onPressed: () => GoRouter.of(context).push('/admin/finances/subscriptions'),
                ),
              ],
            ),
          ),
        ),
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
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(value, style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(label, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.rows});
  final String title;
  final List<RevenueByEventEntry> rows;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    if (rows.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: p.surface2, borderRadius: AppRadius.brMd),
        child: Text(S.finNoData, style: t.bodyMedium!.copyWith(color: p.muted)),
      );
    }
    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 6),
            child: Text(title, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5, letterSpacing: 0.4)),
          ),
          for (var i = 0; i < rows.length; i++) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(rows[i].title, style: t.bodyMedium!.copyWith(fontSize: 13.5, fontWeight: FontWeight.w700)),
                        Text('${rows[i].paidCount} משלמים', style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11)),
                      ],
                    ),
                  ),
                  Text(_money(rows[i].revenueCents), style: t.titleMedium!.copyWith(fontWeight: FontWeight.w700)),
                ],
              ),
            ),
            if (i < rows.length - 1) Container(height: 1, margin: const EdgeInsets.symmetric(horizontal: 14), color: p.border),
          ],
          const SizedBox(height: 6),
        ],
      ),
    );
  }
}

String _money(int cents) => '\$${(cents / 100).toStringAsFixed(0)}';
