import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/admin_providers.dart';

/// Spec: design-specs/IssueRefund.json — admin selects a payment for the event and
/// optionally enters an amount (omit → full refund) + reason. Calls existing
/// `POST /payments/:pid/refund` (admin only, sub-admin blocked).
class IssueRefundScreen extends ConsumerStatefulWidget {
  const IssueRefundScreen({super.key, required this.eventId});
  final String eventId;
  @override
  ConsumerState<IssueRefundScreen> createState() => _S();
}

class _S extends ConsumerState<IssueRefundScreen> {
  final _amountCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();
  String? _selectedPid;
  bool _saving = false;

  @override
  void dispose() {
    _amountCtrl.dispose();
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _refund() async {
    if (_selectedPid == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.required)));
      return;
    }
    setState(() => _saving = true);
    try {
      final amount = int.tryParse(_amountCtrl.text.trim());
      await ref.read(adminRepositoryProvider).refundPayment(
            _selectedPid!,
            amountCents: amount,
            reason: _reasonCtrl.text.trim().isEmpty ? null : _reasonCtrl.text.trim(),
          );
      ref.invalidate(eventPaymentsProvider(widget.eventId));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.refundIssuedToast)));
      GoRouter.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.refundFailed)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(eventPaymentsProvider(widget.eventId));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.refundTitleA, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: SafeArea(
          top: false,
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ErrorState(onRetry: () => ref.invalidate(eventPaymentsProvider(widget.eventId))),
            data: (payments) {
              final eligible = payments.where((pm) {
                final st = (pm['status'] as String?) ?? '';
                return st == 'succeeded' || st == 'partial_refund';
              }).toList();
              if (eligible.isEmpty) {
                return EmptyState(icon: Symbols.payments_rounded, headline: S.finNoData, body: '');
              }
              return ListView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                children: [
                  Text(S.refundChoosePayment, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
                  const SizedBox(height: 8),
                  ...eligible.map((pm) {
                    final pid = (pm['id'] as String?) ?? '';
                    final cents = (pm['amountCents'] as num?)?.toInt() ?? 0;
                    final refunded = (pm['refundedAmountCents'] as num?)?.toInt() ?? 0;
                    final selected = _selectedPid == pid;
                    return InkWell(
                      borderRadius: AppRadius.brMd,
                      onTap: () => setState(() => _selectedPid = pid),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: selected ? p.accentWash : p.surface,
                          borderRadius: AppRadius.brMd,
                          border: Border.all(color: selected ? p.brand : p.border),
                        ),
                        child: Row(
                          children: [
                            Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off,
                                color: selected ? p.brand : p.muted),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                '\$${(cents / 100).toStringAsFixed(0)}'
                                '${refunded > 0 ? ' (הוחזרו \$${(refunded / 100).toStringAsFixed(0)})' : ''}',
                                style: t.bodyMedium!.copyWith(fontWeight: FontWeight.w700),
                              ),
                            ),
                            Text(
                              '…${pid.length > 6 ? pid.substring(pid.length - 6) : pid}',
                              style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 14),
                  AppTextField(controller: _amountCtrl, hint: S.refundAmountField, keyboardType: TextInputType.number),
                  const SizedBox(height: 10),
                  AppTextField(controller: _reasonCtrl, hint: S.refundReasonField, maxLines: 2, maxLength: 200),
                  const SizedBox(height: 14),
                  AppButton.danger(S.refundIssue, loading: _saving, onPressed: _saving ? null : _refund),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
