import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../providers/super_providers.dart';

/// Spec: design-specs/CommunityDetailSuper.json — header + vitals KPIs + Suspend/Restore + Delete.
class CommunityDetailSuperScreen extends ConsumerWidget {
  const CommunityDetailSuperScreen({super.key, required this.cid});
  final String cid;

  Future<void> _restore(BuildContext context, WidgetRef ref) async {
    await ref.read(superRepositoryProvider).restoreCommunity(cid);
    ref.invalidate(superCommunityDetailProvider(cid));
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.superRestoreDone)));
    }
  }

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text(S.superDeleteCta),
        content: const Text(S.superDeleteConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text(S.cancel)),
          TextButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text(S.superDeleteCta)),
        ],
      ),
    );
    if (ok != true) return;
    await ref.read(superRepositoryProvider).deleteCommunity(cid);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text(S.superDeleteDone)));
      GoRouter.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final async = ref.watch(superCommunityDetailProvider(cid));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.superCommunitiesTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(onRetry: () => ref.invalidate(superCommunityDetailProvider(cid))),
          data: (c) {
            final status = (c['status'] as String?) ?? 'active';
            final metrics = (c['metrics'] as Map<String, dynamic>?) ?? const {};
            final isSuspended = status == 'suspended';
            return SafeArea(
              top: false,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                children: [
                  Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(color: p.accentWash, borderRadius: BorderRadius.circular(12)),
                        alignment: Alignment.center,
                        child: Icon(Symbols.groups_rounded, color: p.accentInk),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          (c['name'] as String?) ?? '',
                          style: t.titleLarge!.copyWith(fontSize: 20, fontWeight: FontWeight.w700),
                        ),
                      ),
                      if (isSuspended)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: p.warningWash, borderRadius: AppRadius.brFull),
                          child: Text('מושעית', style: TextStyle(color: p.warning, fontSize: 11, fontWeight: FontWeight.w700)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 2,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                    childAspectRatio: 1.7,
                    children: [
                      _Vital(value: '${metrics['memberCount'] ?? 0}', label: S.superCommunityVitalMembers),
                      _Vital(value: '${metrics['eventCount'] ?? 0}', label: S.superCommunityVitalEvents),
                      _Vital(value: '\$${((metrics['totalRevenueCents'] as num? ?? 0) / 100).toStringAsFixed(0)}', label: S.superCommunityVitalMrr),
                      _Vital(value: (c['privacy'] as String?) ?? '—', label: S.superCommunityVitalPlan),
                    ],
                  ),
                  const SizedBox(height: 18),
                  if (isSuspended)
                    AppButton(
                      S.superRestoreCta,
                      icon: Symbols.restore_rounded,
                      onPressed: () => _restore(context, ref),
                    )
                  else
                    AppButton.secondary(
                      S.superSuspendCta,
                      icon: Symbols.pause_circle_rounded,
                      onPressed: () => GoRouter.of(context).push('/super/communities/$cid/suspend'),
                    ),
                  const SizedBox(height: 10),
                  AppButton.danger(
                    S.superDeleteCta,
                    icon: Symbols.delete_forever_rounded,
                    onPressed: () => _delete(context, ref),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _Vital extends StatelessWidget {
  const _Vital({required this.value, required this.label});
  final String value;
  final String label;
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(value, style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700)),
          Text(label, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
        ],
      ),
    );
  }
}
