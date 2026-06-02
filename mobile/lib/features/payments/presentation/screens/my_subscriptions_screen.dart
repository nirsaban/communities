import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/i18n/strings.dart';
import '../../../../data/models/payment_dto.dart';
import '../providers/payment_providers.dart';

class MySubscriptionsScreen extends ConsumerWidget {
  const MySubscriptionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(mySubscriptionsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text(S.mySubscriptions)),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(mySubscriptionsProvider),
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    e.toString(),
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ),
              ],
            ),
            data: (subs) {
              if (subs.isEmpty) {
                return ListView(
                  children: const [
                    Padding(
                      padding: EdgeInsets.all(24),
                      child: Text(S.noActiveSubscriptions, textAlign: TextAlign.center),
                    ),
                  ],
                );
              }
              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: subs.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (_, i) => _SubscriptionCard(sub: subs[i]),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _SubscriptionCard extends ConsumerWidget {
  const _SubscriptionCard({required this.sub});
  final SubscriptionDto sub;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isCancelling = sub.cancelAtPeriodEnd;
    final periodEnd = sub.currentPeriodEnd != null
        ? DateFormat.yMMMd('he').format(sub.currentPeriodEnd!)
        : '—';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    S.planLabel(sub.plan),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                Chip(label: Text(S.statusLabel(sub.status))),
              ],
            ),
            const SizedBox(height: 8),
            Text('${S.revenueThisMonth}: $periodEnd'),
            if (isCancelling) ...[
              const SizedBox(height: 8),
              Text(S.subscriptionCancelled,
                  style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 12),
            if (!isCancelling && sub.status != 'cancelled')
              OutlinedButton.icon(
                onPressed: () => _confirmCancel(context, ref, sub),
                icon: const Icon(Icons.cancel_outlined),
                label: const Text(S.cancelSubscription),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmCancel(BuildContext context, WidgetRef ref, SubscriptionDto sub) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(S.cancelSubscriptionTitle),
        content: const Text(S.cancelSubscriptionBody),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text(S.cancel)),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text(S.confirm)),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(paymentRepositoryProvider).cancelSubscription(sub.id);
      ref.invalidate(mySubscriptionsProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text(S.subscriptionCancelled)),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    }
  }
}
