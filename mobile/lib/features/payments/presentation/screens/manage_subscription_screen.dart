import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/payment_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/payment_providers.dart';

/// Spec: design-specs/ManageSubscription.json (route "/me/membership", role: member).
/// BackButton, PlanCard, BillingHistoryRow, UpdatePaymentRow, CancelButton (ghost/error).
class ManageSubscriptionScreen extends ConsumerWidget {
  const ManageSubscriptionScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(mySubscriptionsProvider);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.membershipTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(mySubscriptionsProvider);
              await ref.read(mySubscriptionsProvider.future);
            },
            child: async.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => ErrorState(onRetry: () => ref.invalidate(mySubscriptionsProvider)),
              data: (subs) {
                if (subs.isEmpty) return const _EmptyMembership();
                return ListView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                  children: [
                    for (final s in subs) ...[
                      _PlanCard(sub: s),
                      const SizedBox(height: 12),
                    ],
                    const SizedBox(height: 8),
                    _ShortcutCard(),
                    const SizedBox(height: 18),
                    Center(
                      child: TextButton.icon(
                        onPressed: subs.isEmpty
                            ? null
                            : () => GoRouter.of(context).push('/me/membership/cancel?sid=${subs.first.id}'),
                        icon: Icon(Symbols.cancel_rounded, color: p.error, size: 18),
                        label: Text(
                          S.membershipCancelLink,
                          style: TextStyle(color: p.error, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.sub});
  final SubscriptionDto sub;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final periodEnd = sub.currentPeriodEnd;
    final cancelling = sub.cancelAtPeriodEnd;
    return Container(
      padding: const EdgeInsets.all(18),
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
              Icon(Symbols.diamond_rounded, color: p.accentInk),
              const SizedBox(width: 10),
              Text(
                S.planLabel(sub.plan),
                style: t.titleMedium!.copyWith(fontSize: 17, fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              Container(
                height: 22,
                padding: const EdgeInsets.symmetric(horizontal: 10),
                decoration: BoxDecoration(
                  color: cancelling ? p.warningWash : p.successWash,
                  borderRadius: AppRadius.brFull,
                ),
                alignment: Alignment.center,
                child: Text(
                  S.statusLabel(cancelling ? 'cancelled' : sub.status),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: cancelling ? p.warning : p.success,
                  ),
                ),
              ),
            ],
          ),
          if (periodEnd != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Symbols.event_repeat_rounded, size: 16, color: p.muted),
                const SizedBox(width: 6),
                Text(
                  '${cancelling ? S.membershipEndsOn : S.membershipRenewsOn}${periodEnd.day}/${periodEnd.month}/${periodEnd.year}',
                  style: t.bodyMedium!.copyWith(color: p.muted, fontSize: 13),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _ShortcutCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(
        children: [
          _Row(icon: Symbols.history_rounded, label: S.membershipBillingHistory, onTap: () {}),
          Container(height: 1, margin: const EdgeInsetsDirectional.only(start: 46), color: p.border),
          _Row(icon: Symbols.credit_card_rounded, label: S.membershipUpdatePayment, onTap: () {}),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return InkWell(
      borderRadius: AppRadius.brMd,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 22, color: p.accentInk),
            const SizedBox(width: 12),
            Expanded(child: Text(label, style: t.bodyMedium!.copyWith(fontSize: 14.5))),
            Icon(Symbols.chevron_left_rounded, size: 22, color: p.muted),
          ],
        ),
      ),
    );
  }
}

class _EmptyMembership extends ConsumerWidget {
  const _EmptyMembership();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(
      children: [
        const SizedBox(height: 40),
        EmptyState(
          icon: Symbols.diamond_rounded,
          headline: S.membershipNoPlans,
          body: '',
          ctaLabel: S.membershipExplorePlans,
          onCta: () => GoRouter.of(context).push('/subscribe'),
        ),
      ],
    );
  }
}
