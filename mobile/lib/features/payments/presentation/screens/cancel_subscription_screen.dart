import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/payment_providers.dart';

/// Spec: design-specs/CancelSubscription.json (route "/me/membership/cancel").
/// WarningBlob, Title, LosesCard, KeepButton (secondary, leads), CancelAnyway (ghost/error).
class CancelSubscriptionScreen extends ConsumerStatefulWidget {
  const CancelSubscriptionScreen({super.key, required this.subscriptionId});
  final String subscriptionId;

  @override
  ConsumerState<CancelSubscriptionScreen> createState() => _State();
}

class _State extends ConsumerState<CancelSubscriptionScreen> {
  bool _busy = false;

  Future<void> _cancel() async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(paymentRepositoryProvider).cancelSubscription(widget.subscriptionId);
      ref.invalidate(mySubscriptionsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.cancelScheduled)),
      );
      GoRouter.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(S.checkoutOpenFailed)),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.cancelMembershipTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: IconBlob(
                    icon: Symbols.warning_rounded,
                    bg: p.warningWash,
                    color: p.warning,
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  S.cancelMembershipTitle,
                  textAlign: TextAlign.center,
                  style: t.displayMedium!.copyWith(fontSize: 26),
                ),
                const SizedBox(height: 8),
                Text(
                  S.cancelMembershipBody,
                  textAlign: TextAlign.center,
                  style: t.bodyMedium!.copyWith(color: p.muted, height: 1.5),
                ),
                const SizedBox(height: 20),
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
                      Text(
                        S.cancelLoseCard,
                        style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5),
                      ),
                      const SizedBox(height: 8),
                      _Loss(text: S.cancelLose1),
                      _Loss(text: S.cancelLose2),
                      _Loss(text: S.cancelLose3),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                AppButton.secondary(
                  S.cancelKeep,
                  icon: Symbols.diamond_rounded,
                  onPressed: _busy
                      ? null
                      : () {
                          if (GoRouter.of(context).canPop()) GoRouter.of(context).pop();
                        },
                ),
                const SizedBox(height: 10),
                AppButton.ghost(
                  S.cancelAnyway,
                  loading: _busy,
                  onPressed: _busy ? null : _cancel,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Loss extends StatelessWidget {
  const _Loss({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Symbols.do_not_disturb_on_rounded, size: 18, color: p.muted),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: t.bodyMedium!.copyWith(fontSize: 14, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}
