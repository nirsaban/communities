import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../providers/admin_providers.dart';

/// Spec: design-specs/MemberDetail.json — sub-admin/admin profile + ActivityKPIs.
/// LifetimeSpend hidden for sub-admin → SpendGuardCard surfaces instead.
class MemberDetailScreen extends ConsumerWidget {
  const MemberDetailScreen({super.key, required this.userId});
  final String userId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final cid = ref.watch(activeCommunityIdProvider);
    if (cid == null) return const Scaffold(body: Center(child: Text(S.noCommunities)));
    final async = ref.watch(memberDetailProvider(MemberDetailKey(cid: cid, uid: userId)));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        appBar: AppBar(
          backgroundColor: p.background,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: AppBackButton(),
          title: Text(S.memberDetailTitle, style: t.titleMedium!.copyWith(fontSize: 16)),
          centerTitle: true,
        ),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ErrorState(
            onRetry: () => ref.invalidate(memberDetailProvider(MemberDetailKey(cid: cid, uid: userId))),
          ),
          data: (m) => SafeArea(
            top: false,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        color: p.surface2,
                        shape: BoxShape.circle,
                        image: m.photoUrl != null
                            ? DecorationImage(image: NetworkImage(m.photoUrl!), fit: BoxFit.cover)
                            : null,
                      ),
                      alignment: Alignment.center,
                      child: m.photoUrl == null
                          ? Icon(Symbols.person_rounded, color: p.muted, size: 32)
                          : null,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Center(
                    child: Text(
                      m.name.isEmpty ? m.email : m.name,
                      style: t.titleLarge!.copyWith(fontSize: 20, fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: p.accentWash, borderRadius: AppRadius.brFull),
                      child: Text(
                        _roleLabel(m.role),
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: p.accentInk),
                      ),
                    ),
                  ),
                  if ((m.bio ?? '').isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      m.bio!,
                      textAlign: TextAlign.center,
                      style: t.bodyMedium!.copyWith(color: p.muted, height: 1.5),
                    ),
                  ],
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(child: _Kpi(value: '${m.eventsAttended}', label: S.memberEventsAttended)),
                      const SizedBox(width: 8),
                      Expanded(child: _Kpi(value: '${m.postsAuthored}', label: S.memberPostsAuthored)),
                      const SizedBox(width: 8),
                      Expanded(child: _Kpi(value: '${m.initiativesAuthored}', label: S.memberInitiativesAuthored)),
                    ],
                  ),
                  const SizedBox(height: 18),
                  if (!m.spendVisible)
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(color: p.surface2, borderRadius: AppRadius.brMd),
                      child: Row(
                        children: [
                          Icon(Symbols.lock_rounded, color: p.muted, size: 18),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              S.memberSpendHidden,
                              style: t.bodyMedium!.copyWith(color: p.onBackground2, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 18),
                  Container(
                    decoration: BoxDecoration(
                      color: p.surface,
                      borderRadius: AppRadius.brMd,
                      border: Border.all(color: p.border),
                    ),
                    child: Column(
                      children: [
                        _Action(icon: Symbols.shield_person_rounded, label: S.memberPromote, onTap: () {}),
                        _Sep(),
                        _Action(icon: Symbols.pause_circle_rounded, label: S.memberSuspend, onTap: () {}),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  AppButton.secondary(
                    S.memberRemove,
                    icon: Symbols.person_remove_rounded,
                    onPressed: () {},
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _roleLabel(String role) {
    switch (role) {
      case 'admin':
        return 'מנהל';
      case 'subadmin':
        return 'מנהל משנה';
      case 'event_manager':
        return 'אחראי אירועים';
      default:
        return 'חבר';
    }
  }
}

class _Kpi extends StatelessWidget {
  const _Kpi({required this.value, required this.label});
  final String value;
  final String label;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(
        children: [
          Text(value, style: t.titleMedium!.copyWith(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text(label, textAlign: TextAlign.center, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 10.5)),
        ],
      ),
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({required this.icon, required this.label, required this.onTap});
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

class _Sep extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(height: 1, margin: const EdgeInsetsDirectional.only(start: 46), color: context.palette.border);
  }
}
