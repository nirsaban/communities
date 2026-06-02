import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../../commons.dart';
import '../../../../core/i18n/strings.dart';
import '../../../../shared/widgets/widgets.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../events/presentation/providers/event_providers.dart';
import '../../../payments/presentation/providers/payment_providers.dart';
import '../providers/admin_providers.dart';

/// Spec: design-specs/SubAdminDashboard.json (route "/admin/overview", role: subadmin/admin).
/// CommunitySwitcherPill + NotificationsButton, displayMedium title, LimitedAdminBadge,
/// KPIGrid (Members / Upcoming / Pending / Flagged), RevenueGuardBanner, ActivityFeed stub.
class SubAdminDashboardScreen extends ConsumerWidget {
  const SubAdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cid = ref.watch(activeCommunityIdProvider);
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final auth = ref.watch(authNotifierProvider);
    final role = (auth is AuthAuthenticated && auth.memberships.isNotEmpty)
        ? auth.memberships.first.role
        : 'member';

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: p.background,
        body: SafeArea(
          bottom: false,
          child: cid == null
              ? const Center(child: Text(S.noCommunities))
              : RefreshIndicator(
                  onRefresh: () async {
                    ref.invalidate(adminOverviewProvider(cid));
                    await ref.read(adminOverviewProvider(cid).future);
                  },
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                    children: [
                      Row(
                        children: [
                          Text(S.subAdminOverviewTitle,
                              style: t.displayMedium!.copyWith(fontSize: 26)),
                          const Spacer(),
                          IconButton(
                            onPressed: () => GoRouter.of(context).push('/inbox'),
                            icon: Icon(Symbols.notifications_rounded, color: p.onBackground),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (role == 'subadmin')
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: p.warningWash,
                            borderRadius: AppRadius.brFull,
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Symbols.shield_rounded, size: 14, color: p.warning),
                              const SizedBox(width: 6),
                              Text(
                                S.limitedAdmin,
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  color: p.warning,
                                ),
                              ),
                            ],
                          ),
                        ),
                      const SizedBox(height: 18),
                      _OverviewBody(communityId: cid, role: role),
                      const SizedBox(height: 18),
                      if (role == 'subadmin') ...[
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: p.surface2,
                            borderRadius: AppRadius.brMd,
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(Symbols.lock_rounded, size: 18, color: p.muted),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  S.revenueGuardBanner,
                                  style: t.bodyMedium!.copyWith(color: p.onBackground2, fontSize: 13, height: 1.5),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 18),
                      ],
                      _AdminShortcuts(communityId: cid, role: role),
                    ],
                  ),
                ),
        ),
      ),
    );
  }
}

class _OverviewBody extends ConsumerWidget {
  const _OverviewBody({required this.communityId, required this.role});
  final String communityId;
  final String role;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(adminOverviewProvider(communityId));
    final fin = role == 'admin' ? ref.watch(financesProvider(communityId)) : null;
    return async.when(
      loading: () => const SizedBox(height: 120, child: Center(child: CircularProgressIndicator())),
      error: (e, _) => ErrorState(onRetry: () => ref.invalidate(adminOverviewProvider(communityId))),
      data: (k) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.7,
            children: [
              _KpiTile(value: '${k.members}', label: S.kpiMembers, icon: Symbols.group_rounded),
              _KpiTile(value: '${k.upcoming}', label: S.kpiUpcoming, icon: Symbols.event_rounded),
              _KpiTile(value: '${k.pending}', label: S.kpiPending, icon: Symbols.hourglass_top_rounded),
              _KpiTile(value: '${k.flagged}', label: S.kpiFlagged, icon: Symbols.flag_rounded),
            ],
          ),
          if (fin != null) ...[
            const SizedBox(height: 12),
            fin.when(
              loading: () => const SizedBox(height: 60),
              error: (_, __) => const SizedBox(),
              data: (snap) => _KpiTile(
                value: '\$${(snap.totalRevenueCents / 100).toStringAsFixed(0)}',
                label: S.adminRevenue,
                icon: Symbols.attach_money_rounded,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _KpiTile extends StatelessWidget {
  const _KpiTile({required this.value, required this.label, required this.icon});
  final String value;
  final String label;
  final IconData icon;
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
          Icon(icon, size: 20, color: p.accentInk),
          Text(value, style: t.titleLarge!.copyWith(fontSize: 22, fontWeight: FontWeight.w700)),
          Text(label, style: t.labelSmall!.copyWith(color: p.muted, fontSize: 11.5)),
        ],
      ),
    );
  }
}

class _AdminShortcuts extends StatelessWidget {
  const _AdminShortcuts({required this.communityId, required this.role});
  final String communityId;
  final String role;
  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final t = Theme.of(context).textTheme;
    final rows = <(IconData, String, String)>[
      (Symbols.analytics_rounded, S.analyticsTitle, '/admin/analytics'),
      (Symbols.how_to_reg_rounded, S.approvalsTitle, '/admin/members/applications'),
      (Symbols.group_rounded, S.memberListTitle, '/admin/members'),
      (Symbols.flag_rounded, S.moderationTitle, '/admin/moderation'),
      (Symbols.lightbulb_rounded, S.initiativesPendingTitle, '/admin/initiatives/pending'),
      if (role == 'admin') (Symbols.event_rounded, S.adminEventsTitle, '/admin/events'),
      if (role == 'admin') (Symbols.settings_rounded, S.settingsTitle, '/admin/settings'),
      if (role == 'admin') (Symbols.attach_money_rounded, S.finDashboardTitle, '/admin/finances'),
    ];
    return Container(
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: AppRadius.brMd,
        border: Border.all(color: p.border),
      ),
      child: Column(
        children: [
          for (var i = 0; i < rows.length; i++) ...[
            InkWell(
              borderRadius: AppRadius.brMd,
              onTap: () => GoRouter.of(context).push(rows[i].$3),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                child: Row(
                  children: [
                    Icon(rows[i].$1, color: p.accentInk, size: 22),
                    const SizedBox(width: 12),
                    Expanded(child: Text(rows[i].$2, style: t.bodyMedium!.copyWith(fontSize: 14.5))),
                    Icon(Symbols.chevron_left_rounded, size: 22, color: p.muted),
                  ],
                ),
              ),
            ),
            if (i < rows.length - 1)
              Container(
                height: 1,
                margin: const EdgeInsetsDirectional.only(start: 46),
                color: p.border,
              ),
          ],
        ],
      ),
    );
  }
}
