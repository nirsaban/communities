import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../providers/event_manager_providers.dart';
import '../providers/event_providers.dart';

enum _Pricing { free, paid, subscription, external }

/// Spec: design-specs/CreateEventFreeOnly.json + CreateEventFull.json
/// (both route to "/admin/events/new"; UI differs by role).
/// SubAdmin → price locked to free. Admin → full pricing radio.
class CreateEventScreen extends ConsumerStatefulWidget {
  const CreateEventScreen({super.key});

  @override
  ConsumerState<CreateEventScreen> createState() => _State();
}

class _State extends ConsumerState<CreateEventScreen> {
  final _titleCtrl = TextEditingController();
  final _dateCtrl = TextEditingController();
  final _timeCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _capacityCtrl = TextEditingController();
  final _priceCtrl = TextEditingController(text: '0');
  _Pricing _pricing = _Pricing.free;
  bool _subsIncluded = false;
  bool _waitlist = true;
  bool _saving = false;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _dateCtrl.dispose();
    _timeCtrl.dispose();
    _locationCtrl.dispose();
    _capacityCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  bool _isAdminRole(String role) => role == 'admin';

  Future<void> _publish(String communityId, bool isAdmin) async {
    if (_saving) return;
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.required)));
      return;
    }
    DateTime? start;
    try {
      final date = DateTime.parse(_dateCtrl.text.trim());
      final hm = _timeCtrl.text.trim().split(':');
      final h = int.parse(hm[0]);
      final m = hm.length > 1 ? int.parse(hm[1]) : 0;
      start = DateTime(date.year, date.month, date.day, h, m);
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.required)));
      return;
    }
    final end = start.add(const Duration(hours: 1));

    setState(() => _saving = true);
    try {
      final body = <String, dynamic>{
        'title': title,
        'description': '',
        'startAt': start.toIso8601String(),
        'endAt': end.toIso8601String(),
        'timezone': 'UTC',
        'location': _locationCtrl.text.trim().startsWith('http')
            ? {'type': 'online', 'url': _locationCtrl.text.trim()}
            : {'type': 'physical', 'address': _locationCtrl.text.trim()},
        if (int.tryParse(_capacityCtrl.text.trim()) != null)
          'capacity': int.parse(_capacityCtrl.text.trim()),
        'visibility': 'community',
        'status': 'published',
        'pricing': _pricingPayload(isAdmin),
      };
      await ref.read(eventManagerRepoProvider).createEvent(communityId, body);
      ref.invalidate(eventsListProvider(
          EventsQuery(communityId: communityId, bucket: EventsBucket.upcoming)));
      ref.invalidate(managedEventsProvider(const ManagedEventsQuery(bucket: 'upcoming')));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.eventCreated)));
      GoRouter.of(context).pop();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.eventCreateFailed)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Map<String, dynamic> _pricingPayload(bool isAdmin) {
    if (!isAdmin) return {'type': 'free', 'priceCents': 0, 'currency': 'ILS'};
    switch (_pricing) {
      case _Pricing.paid:
        final p = int.tryParse(_priceCtrl.text.trim()) ?? 0;
        return {
          'type': 'paid',
          'priceCents': p * 100,
          'currency': 'ILS',
          'subscriptionIncluded': _subsIncluded,
        };
      case _Pricing.subscription:
        return {'type': 'subscription_only', 'priceCents': 0, 'currency': 'ILS'};
      case _Pricing.external:
        return {'type': 'external', 'priceCents': 0, 'currency': 'ILS'};
      case _Pricing.free:
        return {'type': 'free', 'priceCents': 0, 'currency': 'ILS'};
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final auth = ref.watch(authNotifierProvider);
    final cid = ref.watch(activeCommunityIdProvider);
    if (auth is! AuthAuthenticated || cid == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final role = auth.memberships
        .firstWhere(
          (m) => m.communityId == cid,
          orElse: () => auth.memberships.first,
        )
        .role;
    final isAdmin = _isAdminRole(role);

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        body: SafeArea(
          child: Column(
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
                    const Spacer(),
                    TextButton(
                      onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text(S.draftSaved)),
                      ),
                      child: Text(
                        S.draftSave,
                        style: t.labelLarge!.copyWith(color: p.accentInk, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(S.eventCreateTitle, style: t.displayMedium!.copyWith(fontSize: 26)),
                      const SizedBox(height: 16),
                      AppTextField(controller: _titleCtrl, hint: S.eventTitleField),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: AppTextField(controller: _dateCtrl, hint: S.eventDateField),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: AppTextField(controller: _timeCtrl, hint: S.eventTimeField),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      AppTextField(
                        controller: _locationCtrl,
                        hint: S.eventLocationField,
                        leadingIcon: Symbols.place_rounded,
                      ),
                      const SizedBox(height: 12),
                      AppTextField(
                        controller: _capacityCtrl,
                        hint: S.eventCapacityField,
                        keyboardType: TextInputType.number,
                      ),
                      const SizedBox(height: 12),
                      SwitchListTile.adaptive(
                        contentPadding: EdgeInsets.zero,
                        title: Text(S.eventWaitlistToggle, style: t.bodyMedium!.copyWith(fontSize: 14)),
                        value: _waitlist,
                        onChanged: (v) => setState(() => _waitlist = v),
                      ),
                      const SizedBox(height: 12),
                      // Pricing — radio for admin; locked for subadmin.
                      if (isAdmin) ...[
                        _PricingPicker(value: _pricing, onChanged: (v) => setState(() => _pricing = v)),
                        if (_pricing == _Pricing.paid) ...[
                          const SizedBox(height: 12),
                          AppTextField(
                            controller: _priceCtrl,
                            hint: S.eventPriceField,
                            keyboardType: TextInputType.number,
                          ),
                          const SizedBox(height: 8),
                          SwitchListTile.adaptive(
                            contentPadding: EdgeInsets.zero,
                            title: Text(S.eventSubsIncluded, style: t.bodyMedium!.copyWith(fontSize: 14)),
                            value: _subsIncluded,
                            onChanged: (v) => setState(() => _subsIncluded = v),
                          ),
                        ],
                      ] else ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: p.surface2,
                            borderRadius: AppRadius.brMd,
                          ),
                          child: Row(
                            children: [
                              Icon(Symbols.lock_rounded, color: p.muted, size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  S.eventPricingLocked,
                                  style: t.bodyMedium!.copyWith(color: p.muted, fontSize: 13),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: AppButton(
                  S.eventPublishCta,
                  icon: Symbols.publish_rounded,
                  loading: _saving,
                  onPressed: _saving ? null : () => _publish(cid, isAdmin),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PricingPicker extends StatelessWidget {
  const _PricingPicker({required this.value, required this.onChanged});
  final _Pricing value;
  final ValueChanged<_Pricing> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    const options = [_Pricing.free, _Pricing.paid, _Pricing.subscription, _Pricing.external];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((opt) {
        final selected = value == opt;
        final label = switch (opt) {
          _Pricing.free => S.eventPricingFree,
          _Pricing.paid => S.eventPricingPaid,
          _Pricing.subscription => S.eventPricingSubscription,
          _Pricing.external => S.eventPricingExternal,
        };
        return InkWell(
          borderRadius: AppRadius.brFull,
          onTap: () => onChanged(opt),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: selected ? p.accentWash : p.surface,
              borderRadius: AppRadius.brFull,
              border: Border.all(color: selected ? p.brand : p.border),
            ),
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: selected ? p.accentInk : p.onBackground,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
