import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';

/// Spec: design-specs/RefundReceived.json (route "/pay/refund", role: member).
/// RefundBlob (accent), Title, RefundCard (amount / card / ref + arrival window),
/// DoneButton (secondary).
class RefundReceivedScreen extends StatelessWidget {
  const RefundReceivedScreen({
    super.key,
    this.amountCents = 0,
    this.currency = 'USD',
    this.last4,
    this.reference,
  });

  final int amountCents;
  final String currency;
  final String? last4;
  final String? reference;

  String get _amount {
    final n = (amountCents / 100).toStringAsFixed((amountCents % 100 == 0) ? 0 : 2);
    switch (currency.toUpperCase()) {
      case 'ILS':
        return '₪$n';
      case 'EUR':
        return '€$n';
      case 'USD':
      default:
        return '\$$n';
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
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: IconBlob(
                    icon: Symbols.payments_rounded,
                    bg: p.accentWash,
                    color: p.accentInk,
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  S.refundTitle,
                  textAlign: TextAlign.center,
                  style: t.displayMedium!.copyWith(fontSize: 26),
                ),
                const SizedBox(height: 8),
                Text(
                  S.refundArrives,
                  textAlign: TextAlign.center,
                  style: t.bodyMedium!.copyWith(color: p.muted, height: 1.5),
                ),
                const SizedBox(height: 22),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: p.surface,
                    borderRadius: AppRadius.brMd,
                    border: Border.all(color: p.border),
                  ),
                  child: Column(
                    children: [
                      _RefundRow(label: S.refundAmount, value: _amount, emphasize: true),
                      const Divider(height: 24),
                      _RefundRow(label: S.refundCardLabel, value: last4 != null ? '•••• $last4' : '—'),
                      const Divider(height: 24),
                      _RefundRow(label: S.refundReference, value: reference ?? '—'),
                    ],
                  ),
                ),
                const SizedBox(height: 22),
                AppButton.secondary(
                  S.refundDone,
                  onPressed: () => GoRouter.of(context).canPop()
                      ? GoRouter.of(context).pop()
                      : GoRouter.of(context).go('/home'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RefundRow extends StatelessWidget {
  const _RefundRow({required this.label, required this.value, this.emphasize = false});
  final String label;
  final String value;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final style = emphasize
        ? t.titleMedium!.copyWith(fontSize: 16, fontWeight: FontWeight.w700)
        : t.bodyMedium!.copyWith(fontSize: 13.5);
    return Row(
      children: [
        Expanded(child: Text(label, style: emphasize ? style : style.copyWith(color: p.muted))),
        Text(value, style: style),
      ],
    );
  }
}
