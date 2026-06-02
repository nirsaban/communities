import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/i18n/strings.dart';
import '../providers/payment_providers.dart';

class FinancesScreen extends ConsumerWidget {
  const FinancesScreen({super.key, required this.communityId});
  final String communityId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(financesProvider(communityId));
    final usd = NumberFormat.currency(locale: 'he', symbol: '\$');
    String fmt(int cents) => usd.format(cents / 100);
    return Scaffold(
      appBar: AppBar(title: const Text(S.financialDashboard)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(financesProvider(communityId)),
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ListView(children: [
              Padding(
                padding: const EdgeInsets.all(24),
                child: Text(e.toString(),
                    style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ),
            ]),
            data: (snap) {
              return ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Row(
                    children: [
                      Expanded(child: _Stat(label: S.totalRevenue, value: fmt(snap.totalRevenueCents))),
                      const SizedBox(width: 12),
                      Expanded(child: _Stat(label: S.revenueThisMonth, value: fmt(snap.revenueThisMonth))),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: _Stat(label: S.revenueThisWeek, value: fmt(snap.revenueThisWeek))),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _Stat(
                          label: S.activeSubscriptionsLabel,
                          value: '${snap.activeSubscriptions}',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Text(S.revenueByEvent, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  if (snap.revenueByEvent.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 24),
                      child: Center(child: Text(S.noFinancialData)),
                    )
                  else
                    ...snap.revenueByEvent.map(
                      (e) => Card(
                        child: ListTile(
                          title: Text(e.title),
                          subtitle: Text('${S.paidCount}: ${e.paidCount}'),
                          trailing: Text(fmt(e.revenueCents)),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 8),
            Text(value, style: Theme.of(context).textTheme.headlineSmall),
          ],
        ),
      ),
    );
  }
}
