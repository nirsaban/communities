import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/payment_providers.dart';

/// Spec: design-specs/PaymentFailure.json (route "/pay/failed", role: member).
/// ErrorBlob, Title, DeclinedCard (with reason), TryAgain (primary), DifferentCard (secondary).
class PaymentFailureScreen extends ConsumerWidget {
  const PaymentFailureScreen({super.key, this.eventId, this.reason});
  final String? eventId;
  final String? reason;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final lastErr = ref.watch(checkoutProvider).errorMessage;
    final displayReason = reason ?? lastErr;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: IconBlob(
                    icon: Symbols.error_rounded,
                    bg: p.errorWash,
                    color: p.error,
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  S.paymentFailedTitle,
                  textAlign: TextAlign.center,
                  style: t.displayMedium!.copyWith(fontSize: 26),
                ),
                const SizedBox(height: 8),
                Text(
                  S.paymentFailedBody,
                  textAlign: TextAlign.center,
                  style: t.bodyMedium!.copyWith(color: p.muted, height: 1.5),
                ),
                const SizedBox(height: 22),
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
                        S.paymentFailedReason,
                        style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        (displayReason ?? '').isEmpty ? 'unknown_decline' : displayReason!,
                        style: t.bodyMedium!.copyWith(fontSize: 13.5, height: 1.5),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                AppButton(
                  S.paymentFailedTryAgain,
                  icon: Symbols.refresh_rounded,
                  onPressed: eventId == null
                      ? () => GoRouter.of(context).go('/home')
                      : () => GoRouter.of(context).go('/events/$eventId/checkout'),
                ),
                const SizedBox(height: 10),
                AppButton.secondary(
                  S.paymentFailedDifferentCard,
                  onPressed: eventId == null
                      ? () => GoRouter.of(context).go('/home')
                      : () => GoRouter.of(context).go('/events/$eventId/checkout'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
