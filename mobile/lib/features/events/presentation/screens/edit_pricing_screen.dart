import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../data/models/event_dto.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/event_manager_providers.dart';
import '../providers/event_providers.dart';

/// Spec: design-specs/EditPricing.json (route "/admin/events/:id/pricing").
/// IntegrityWarningCard, BasePriceField, PriceTierList (DEVIATION — tiers deferred,
/// PRD 09 §12 also notes no promo codes in v1; price tiers are a stretch goal).
class EditPricingScreen extends ConsumerStatefulWidget {
  const EditPricingScreen({super.key, required this.eventId});
  final String eventId;

  @override
  ConsumerState<EditPricingScreen> createState() => _State();
}

class _State extends ConsumerState<EditPricingScreen> {
  final _basePriceCtrl = TextEditingController();
  bool _hydrated = false;
  bool _saving = false;

  @override
  void dispose() {
    _basePriceCtrl.dispose();
    super.dispose();
  }

  void _hydrate(EventDto e) {
    if (_hydrated) return;
    _hydrated = true;
    _basePriceCtrl.text = (e.pricing.priceCents / 100).toStringAsFixed(0);
  }

  Future<void> _save() async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final cents = (int.tryParse(_basePriceCtrl.text.trim()) ?? 0) * 100;
      await ref.read(eventManagerRepoProvider).updateEvent(widget.eventId, {
        'pricing': {
          'type': cents > 0 ? 'paid' : 'free',
          'priceCents': cents,
          'currency': 'USD',
        },
      });
      ref.invalidate(eventDetailProvider(widget.eventId));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.profileSaveSuccess)));
      GoRouter.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.eventSaveFailed)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(eventDetailProvider(widget.eventId));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.eventPricingTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
          actions: [
            TextButton(
              onPressed: _saving ? null : _save,
              child: Text(S.save,
                  style: t.labelLarge!.copyWith(color: p.accentInk, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(eventDetailProvider(widget.eventId))),
          data: (event) {
            _hydrate(event);
            final hasRsvps = event.metrics.rsvpCount > 0;
            return SafeArea(
              top: false,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                children: [
                  if (hasRsvps)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: p.warningWash,
                        borderRadius: AppRadius.brMd,
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Symbols.warning_rounded, color: p.warning),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              S.eventPricingIntegrityWarning,
                              style: t.bodyMedium!.copyWith(
                                color: p.warning,
                                fontSize: 13,
                                height: 1.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (hasRsvps) const SizedBox(height: 14),
                  AppTextField(
                    controller: _basePriceCtrl,
                    hint: S.eventPriceField,
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: p.surface2,
                      borderRadius: AppRadius.brMd,
                    ),
                    child: Row(
                      children: [
                        Icon(Symbols.info_rounded, size: 18, color: p.muted),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'מחירי שלבים (Early-bird / member) זמינים בעדכון הבא.',
                            style: t.bodyMedium!.copyWith(color: p.muted, fontSize: 12.5),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  AppButton(S.eventSaveCta, loading: _saving, onPressed: _saving ? null : _save),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
