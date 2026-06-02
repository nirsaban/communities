import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../providers/payment_providers.dart';

/// Spec: design-specs/SubscriptionPlans.json (route "/subscribe", role: member).
/// CloseButton, Title (displayMedium), BillingToggle (segmented Annual/Monthly),
/// PlanCard (featureList), SubscribeButton (primary, full).
class SubscriptionPlansScreen extends ConsumerStatefulWidget {
  const SubscriptionPlansScreen({super.key, this.communityId});
  final String? communityId;

  @override
  ConsumerState<SubscriptionPlansScreen> createState() => _State();
}

enum _Plan { annual, monthly }

class _State extends ConsumerState<SubscriptionPlansScreen> {
  _Plan _plan = _Plan.annual;

  Future<void> _subscribe() async {
    final cid = widget.communityId ?? ref.read(activeCommunityIdProvider);
    if (cid == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.noCommunities)),
      );
      return;
    }
    final ok = await ref
        .read(checkoutProvider.notifier)
        .subscribe(cid, plan: _plan == _Plan.annual ? 'annual' : 'monthly');
    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.subscribeOpening)),
      );
    } else {
      final err = ref.read(checkoutProvider).errorMessage;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(err ?? S.checkoutOpenFailed)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final isLoading = ref.watch(checkoutProvider).isLoading;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => GoRouter.of(context).canPop()
                          ? GoRouter.of(context).pop()
                          : GoRouter.of(context).go('/home'),
                      icon: Icon(Symbols.close_rounded, color: p.onBackground),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        S.plansTitle,
                        textAlign: TextAlign.center,
                        style: t.displayMedium!.copyWith(fontSize: 26),
                      ),
                      const SizedBox(height: 18),
                      _BillingToggle(
                        value: _plan,
                        onChanged: (v) => setState(() => _plan = v),
                      ),
                      const SizedBox(height: 18),
                      _PlanCard(plan: _plan),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: AppButton(
                  S.subscribeCta,
                  icon: Symbols.diamond_rounded,
                  loading: isLoading,
                  onPressed: isLoading ? null : _subscribe,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BillingToggle extends StatelessWidget {
  const _BillingToggle({required this.value, required this.onChanged});
  final _Plan value;
  final ValueChanged<_Plan> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: p.surface2,
        borderRadius: AppRadius.brFull,
      ),
      child: Row(
        children: [
          Expanded(child: _Seg(label: S.planAnnual, active: value == _Plan.annual, onTap: () => onChanged(_Plan.annual))),
          Expanded(child: _Seg(label: S.planMonthly, active: value == _Plan.monthly, onTap: () => onChanged(_Plan.monthly))),
        ],
      ),
    );
  }
}

class _Seg extends StatelessWidget {
  const _Seg({required this.label, required this.active, required this.onTap});
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Material(
      color: active ? p.surface : Colors.transparent,
      borderRadius: AppRadius.brFull,
      child: InkWell(
        borderRadius: AppRadius.brFull,
        onTap: onTap,
        child: Container(
          height: 36,
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 13.5,
              color: active ? p.onBackground : p.muted,
            ),
          ),
        ),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.plan});
  final _Plan plan;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final isAnnual = plan == _Plan.annual;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.brand, width: 1.5),
        boxShadow: AppShadows.low(dark: dark),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                isAnnual ? S.planAnnual : S.planMonthly,
                style: t.titleMedium!.copyWith(fontSize: 17, fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              if (isAnnual)
                Container(
                  height: 22,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(color: p.accentWash, borderRadius: AppRadius.brFull),
                  alignment: Alignment.center,
                  child: Text(
                    S.planAnnualSavings,
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: p.accentInk),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            isAnnual ? S.planAnnualPrice() : S.planMonthlyPrice(),
            style: t.displayMedium!.copyWith(fontSize: 30, height: 1.1),
          ),
          const SizedBox(height: 18),
          for (final f in const [S.planFeature1, S.planFeature2, S.planFeature3, S.planFeature4])
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Icon(Symbols.check_rounded, color: p.success, size: 18),
                  const SizedBox(width: 10),
                  Expanded(child: Text(f, style: t.bodyMedium!.copyWith(fontSize: 14, height: 1.4))),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
