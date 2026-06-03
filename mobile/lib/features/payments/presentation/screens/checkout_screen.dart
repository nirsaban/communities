import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../core/utils/format_currency.dart';
import '../../../../data/models/event_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../providers/payment_providers.dart';

/// Spec: design-specs/Checkout.json (route "/events/:id/checkout", role: member).
/// EventSummaryCard, LineItems, TotalRow, PayButton (primary).
///
/// Tap PayButton → backend creates a PayPlus hosted page → URL launched in the
/// system browser → mobile polls /payments/success?ref=<paymentId> every 2s up
/// to 60s (handled inside CheckoutNotifier._pollUntilTerminal) → on confirmed
/// → /pay/success ; on failed / timeout → /pay/failed.
class CheckoutScreen extends ConsumerWidget {
  const CheckoutScreen({super.key, required this.eventId});
  final String eventId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(eventDetailProvider(eventId));
    final checkout = ref.watch(checkoutProvider);
    final isBusy = checkout.isLoading || checkout.isPolling;

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.checkoutTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(eventDetailProvider(eventId))),
          data: (event) => _Body(
            event: event,
            isLoading: checkout.isLoading,
            isPolling: checkout.isPolling,
            onPay: () async {
              final outcome =
                  await ref.read(checkoutProvider.notifier).payForEvent(event.id);
              if (!context.mounted) return;
              switch (outcome) {
                case CheckoutOutcome.confirmed:
                  GoRouter.of(context).push('/pay/success?eventId=${event.id}');
                  break;
                case CheckoutOutcome.failed:
                case CheckoutOutcome.cancelled:
                  final err = ref.read(checkoutProvider).errorMessage;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(err ?? S.checkoutOpenFailed)),
                  );
                  GoRouter.of(context).push('/pay/failed?eventId=${event.id}');
                  break;
                case CheckoutOutcome.timeout:
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text(S.checkoutOpenedSnack)),
                  );
                  break;
              }
            },
          ),
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.event,
    required this.isLoading,
    required this.isPolling,
    required this.onPay,
  });
  final EventDto event;
  final bool isLoading;
  final bool isPolling;
  final VoidCallback onPay;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final price = event.pricing.priceCents;
    final maxInstallments = event.pricing.maxInstallments;
    final installmentsLine = formatInstallments(
      totalAgorot: price,
      installments: maxInstallments,
    );

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _EventSummary(event: event),
                const SizedBox(height: 18),
                Text(S.checkoutSummary, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: p.surface,
                    borderRadius: AppRadius.brMd,
                    border: Border.all(color: p.border),
                    boxShadow: AppShadows.low(dark: dark),
                  ),
                  child: Column(
                    children: [
                      _LineRow(label: S.checkoutLineTicket, value: formatILS(price)),
                      const SizedBox(height: 6),
                      _LineRow(label: S.checkoutLineProcessing, value: formatILS(0)),
                      const Divider(height: 24),
                      _LineRow(
                        label: S.checkoutTotal,
                        value: formatILS(price),
                        emphasize: true,
                      ),
                      if (installmentsLine != null) ...[
                        const SizedBox(height: 6),
                        Align(
                          alignment: AlignmentDirectional.centerStart,
                          child: Text(
                            installmentsLine,
                            style: t.labelSmall!.copyWith(color: p.muted, fontSize: 12),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Symbols.lock_rounded, size: 16, color: p.muted),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        S.checkoutSecuredBy,
                        style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5, height: 1.5),
                      ),
                    ),
                  ],
                ),
                if (isPolling) ...[
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        S.checkoutProcessing,
                        style: t.bodyMedium!.copyWith(color: p.muted, fontSize: 13),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          decoration: BoxDecoration(
            color: p.surface,
            border: Border(top: BorderSide(color: p.border)),
          ),
          child: SafeArea(
            top: false,
            child: AppButton(
              S.checkoutPay,
              icon: Symbols.lock_rounded,
              loading: isLoading || isPolling,
              onPressed: (isLoading || isPolling) ? null : onPay,
            ),
          ),
        ),
      ],
    );
  }
}

class _EventSummary extends StatelessWidget {
  const _EventSummary({required this.event});
  final EventDto event;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(color: p.surface2, borderRadius: BorderRadius.circular(10)),
            alignment: Alignment.center,
            child: event.coverImageUrl != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.network(event.coverImageUrl!, width: 56, height: 56, fit: BoxFit.cover),
                  )
                : Icon(Symbols.event_rounded, color: p.muted),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.title,
                  style: t.titleMedium!.copyWith(fontSize: 15, fontWeight: FontWeight.w700),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  _formatStart(event.startAt),
                  style: t.bodyMedium!.copyWith(color: p.muted, fontSize: 12.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LineRow extends StatelessWidget {
  const _LineRow({required this.label, required this.value, this.emphasize = false});
  final String label;
  final String value;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final style = emphasize
        ? t.titleMedium!.copyWith(fontSize: 16, fontWeight: FontWeight.w700)
        : t.bodyMedium!.copyWith(fontSize: 14, color: p.onBackground2);
    return Row(
      children: [
        Expanded(child: Text(label, style: style)),
        Text(value, style: style),
      ],
    );
  }
}

String _formatStart(DateTime dt) {
  const months = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  return '${dt.day} ${months[dt.month - 1]} ${dt.year} · ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}
